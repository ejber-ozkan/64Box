use sha2::{Sha256, Digest};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce as AesIv
};
use base64::{Engine as _, engine::general_purpose};

pub fn get_encryption_key() -> [u8; 32] {
    let uid = machine_uid::get().unwrap_or_else(|_| "fixed-fallback-uid".to_string());
    let mut hasher = Sha256::new();
    hasher.update(uid.as_bytes());
    hasher.update(b"64Box-Salt-2026"); // Application specific salt
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

pub fn encrypt_value(value: &str) -> Result<String, String> {
    let key = get_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    
    // In a real production app, use a unique initialization vector per encryption.
    let iv_bytes = &key[0..12]; 
    let iv = AesIv::from_slice(iv_bytes);
    
    let ciphertext = cipher
        .encrypt(iv, value.as_bytes())
        .map_err(|e| e.to_string())?;
        
    Ok(general_purpose::STANDARD.encode(ciphertext))
}

pub fn decrypt_value(encrypted_base64: &str) -> Result<String, String> {
    let key = get_encryption_key();
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    
    let ciphertext = general_purpose::STANDARD
        .decode(encrypted_base64)
        .map_err(|e| e.to_string())?;
        
    let iv_bytes = &key[0..12];
    let iv = AesIv::from_slice(iv_bytes);
    
    let plaintext = cipher
        .decrypt(iv, ciphertext.as_slice())
        .map_err(|e| e.to_string())?;
        
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_roundtrip() {
        let original = "secret-key-123";
        let encrypted = encrypt_value(original).expect("Encryption failed");
        let decrypted = decrypt_value(&encrypted).expect("Decryption failed");
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_encryption_empty_string() {
        let original = "";
        let encrypted = encrypt_value(original).unwrap();
        let decrypted = decrypt_value(&encrypted).unwrap();
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_encryption_long_string() {
        let original = "A".repeat(1024);
        let encrypted = encrypt_value(&original).unwrap();
        let decrypted = decrypt_value(&encrypted).unwrap();
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_invalid_decrypt() {
        let res = decrypt_value("not-base64");
        assert!(res.is_err());
        
        // Valid base64 but invalid ciphertext format (too short for GCM, or bad tag)
        let res2 = decrypt_value("SGVsbG8="); // "Hello" base64 encoded
        assert!(res2.is_err());

        // Valid base64 but not encrypted data (longer string)
        let res3 = decrypt_value("SGVsbG8gd29ybGQ="); // "Hello world" base64 encoded
        assert!(res3.is_err());
    }

    #[test]
    fn test_tamper_detection() {
        let original = "secret_password";
        let encrypted = encrypt_value(original).unwrap();
        
        // Modify one character in the base64 string
        let mut tampered = encrypted.clone();
        if tampered.len() > 10 {
            let last_char = tampered.pop().unwrap();
            let new_char = if last_char == 'A' { 'B' } else { 'A' };
            tampered.push(new_char);
        }
        
        let result = decrypt_value(&tampered);
        // Should fail because AES-GCM tags won't match or base64 decoding might fail if we hit padding
        assert!(result.is_err());
    }
}
