# Add Google Tag Manager to all HTML files

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

# Get all HTML files (including secondary domain)
$htmlFiles = @()
$htmlFiles += Get-ChildItem -Path "." -Depth 1 -Filter "*.html" -File | Select-Object -ExpandProperty FullName
$htmlFiles += Get-ChildItem -Path ".\secondary-domain" -Recurse -Filter "*.html" -File | Select-Object -ExpandProperty FullName

Write-Host "Found $($htmlFiles.Count) HTML files to process"

foreach ($file in $htmlFiles) {
    $content = Get-Content $file -Raw -Encoding UTF8

    # Check if GTM is already present
    if ($content -contains "GTM-56P4HC53") {
        Write-Host "Skipping $file - GTM already present"
        continue
    }

    # Add head script after <head>
    if ($content -match '<head[^>]*>') {
        $content = $content -replace '(<head[^>]*>)', "`$1`n$gtmHeadScript"
    }

    # Add noscript after <body>
    if ($content -match '<body[^>]*>') {
        $content = $content -replace '(<body[^>]*>)', "`$1`n$gtmNoscript"
    }

    # Write back
    Set-Content $file -Value $content -Encoding UTF8 -NoNewline
    Write-Host "Updated: $file"
}

Write-Host "Done! GTM added to all HTML files."
