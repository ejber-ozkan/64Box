const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("GameBaseBox release branding", () => {
  test("uses GameBaseBox 0.1.0 metadata across package, Tauri, and Cargo", () => {
    const packageJson = readJson("package.json");
    const tauriConfig = readJson("src-tauri/tauri.conf.json");
    const cargoToml = readText("src-tauri/Cargo.toml");
    const version = readText("VERSION").trim();

    expect(packageJson.name).toBe("gamebasebox");
    expect(packageJson.version).toBe("0.1.0");
    expect(tauriConfig.productName).toBe("GBBox");
    expect(tauriConfig.version).toBe("0.1.0");
    expect(tauriConfig.identifier).toBe("com.gamebasebox.desktop");
    expect(tauriConfig.app.windows[0].title).toBe("GBBox - GameBase Box");
    expect(cargoToml).toContain('name = "gamebasebox"');
    expect(cargoToml).toContain('version = "0.1.0"');
    expect(cargoToml).toContain('description = "GBBox - GameBase Box"');
    expect(version).toBe("0.1.0");
  });

  test("presents GBBox as GameBase Box in public README and app chrome", () => {
    const readme = readText("README.md");
    const layout = readText("src/app/layout.tsx");
    const splash = readText("src/components/AppLaunchSplash.tsx");
    const libraryHeader = readText("src/components/library/LibraryHeader.tsx");
    const bigBoxHeader = readText("src/components/bigbox/BigBoxHeader.tsx");
    const aboutTab = readText("src/components/settings/AboutSettingsTab.tsx");
    const icon = readText("src-tauri/icons/app-icon.svg");

    expect(readme).toContain("# GBBox");
    expect(readme).toContain("GameBase Box");
    expect(readme).toContain("Commodore 64, Atari 800, and Atari 2600");
    expect(readme).toContain("https://github.com/ejber-ozkan/GameBaseBox");
    expect(layout).toContain('title: "GBBox"');
    expect(layout).toContain("GameBase Box");
    expect(splash).toContain("GBBox");
    expect(libraryHeader).toContain("GBBox");
    expect(libraryHeader).toContain("GameBase Box");
    expect(bigBoxHeader).toContain("GBBox");
    expect(bigBoxHeader).toContain("GameBase Box");
    expect(aboutTab).toContain("GBBox");
    expect(aboutTab).toContain("GameBase Box");
    expect(aboutTab).toContain("Atari 800");
    expect(aboutTab).toContain("Atari 2600");
    expect(icon).toContain(">GB<");
    expect(icon).toContain(">Box<");
    expect(icon).not.toContain(">64<");
  });
});
