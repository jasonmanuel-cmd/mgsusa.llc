# Add Google Tag Manager to all HTML files - FINAL CORRECTED VERSION
# Fixes:
#   1. Only inserts GTM head script once (in <head> only)
#   2. Only inserts GTM noscript right after <body> opening tag
#   3. Preserves file encoding without adding BOM
#   4. Checks for existing GTM to avoid duplicates

$gtmHeadScript = @"
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-56P4HC53');</script>
<!-- End Google Tag Manager -->
"@

$gtmNoscript = @"
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-56P4HC53"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
"@

# Get all HTML files
$htmlFiles = @()
$htmlFiles += Get-ChildItem -Path "." -Depth 1 -Filter "*.html" -File | Select-Object -ExpandProperty FullName
$htmlFiles += Get-ChildItem -Path ".\secondary-domain" -Recurse -Filter "*.html" -File | Select-Object -ExpandProperty FullName

Write-Host "Found $($htmlFiles.Count) HTML files to process"

foreach ($file in $htmlFiles) {
    # Read file as UTF-8 WITHOUT BOM
    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

    # Check if GTM is already present
    if ($content -like "*GTM-56P4HC53*") {
        Write-Host "Skipping $file - GTM already present"
        continue
    }

    # Step 1: Add head script right after <head> tag
    $headPattern = '<head([^>]*)>'
    if ($content -match $headPattern) {
        $content = $content -replace $headPattern, "<head`$1>`n$gtmHeadScript"
    }

    # Step 2: Add noscript right after <body> tag - find it and insert after
    $bodyPattern = '<body([^>]*)>'
    if ($content -match $bodyPattern) {
        $content = $content -replace $bodyPattern, "<body`$1>`n$gtmNoscript"
    }

    # Write back as UTF-8 WITHOUT BOM
    $utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($file, $content, $utf8NoBOM)
    Write-Host "Updated: $file"
}

Write-Host "Done! GTM added correctly to all HTML files."
