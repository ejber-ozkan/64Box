param (
    [Parameter(Mandatory=$true)]
    [string]$DbPath,
    [Parameter(Mandatory=$true)]
    [string]$OutputDir
)

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

$connString = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$DbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connString)

try {
    $conn.Open()
} catch {
    Write-Error "Failed to open database. Ensure you are running 32-bit PowerShell if using Jet 4.0.`n$($_.Exception.Message)"
    exit 1
}

$tables = @(
    "Games", "Developers", "Publishers", "Musicians", "Genres", "Languages", "Years", "Music", "PGenres"
)

foreach ($table in $tables) {
    Write-Host "Exporting $table..."
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT * FROM [$table]"
    $da = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    $da.Fill($dt) | Out-Null
    
    $outFile = Join-Path -Path $OutputDir -ChildPath "$table.csv"
    $dt | Export-Csv -Path $outFile -NoTypeInformation -Encoding UTF8
}

$conn.Close()
Write-Host "Export Complete!"
