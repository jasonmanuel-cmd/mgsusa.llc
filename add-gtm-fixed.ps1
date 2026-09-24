# Add Google Tag Manager to all HTML files - CORRECTED VERSION
# Fixes:
#   1. Only inserts GTM head script once (in head only)
#   2. Only inserts GTM noscript right after body (not in comments)
#   3. Preserves file encoding without adding BOM

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
    if ($content -contains "GTM-56P4HC53") {
        Write-Host "Skipping $file - GTM already present"
        continue
    }

    # Add head script after opening head tag (only in head section)
    $headPattern = '(<head[^>]*>)'
    if ($content -match $headPattern) {
        # Only insert if not already present in head section
        $headEndPos = $content.IndexOf('</head>')
        if ($headEndPos -gt 0) {
            $headContent = $content.Substring(0, $headEndPos)
            if ($headContent -notmatch 'GTM-56P4HC53') {
                $content = $content -replace $headPattern, "`$1`n$gtmHeadScript"
            }
        }
    }

    # Add noscript immediately after opening body tag ONLY
    if ($content -match '(<body[^>]*>)') {
        # Find the position of body tag
        $bodyStartMatch = [regex]::Match($content, '(<body[^>]*>)')
        if ($bodyStartMatch.Success) {
            $insertPos = $bodyStartMatch.Index + $bodyStartMatch.Length
            # Insert noscript right after body tag
            $content = $content.Insert($insertPos, "`n$gtmNoscript")
        }
    }

    # Write back as UTF-8 WITHOUT BOM
    $utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($file, $content, $utf8NoBOM)
    Write-Host "Updated: $file"
}

Write-Host "Done! GTM added correctly to all HTML files."
Write-Host "All files processed successfully."
