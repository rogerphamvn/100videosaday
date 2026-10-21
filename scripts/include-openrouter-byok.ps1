param([Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$KeyHash)

# Owner-run helper. No credential is saved, printed or accepted as a command-line argument.
# Changes only BYOK inclusion on an existing, already capped pilot key.
$ErrorActionPreference = 'Stop'
$secret = Read-Host 'OpenRouter MANAGEMENT key (hidden; never paste into chat)' -AsSecureString
$pointer = [IntPtr]::Zero
$headers = $null
try {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $headers = @{ Authorization = 'Bearer ' + [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  $uri = 'https://openrouter.ai/api/v1/keys/' + $KeyHash
  $before = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
  if ($null -eq $before.data.limit -or [double]$before.data.limit -gt 2 -or [double]$before.data.limit -le 0 -or $null -ne $before.data.limit_reset) {
    throw 'The target must already have a positive total limit at most USD 2 and no reset. Nothing changed.'
  }
  $null = Invoke-RestMethod -Method Patch -Uri $uri -Headers $headers -ContentType 'application/json' -Body '{"include_byok_in_limit":true}'
  $after = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
  if ($after.data.include_byok_in_limit -ne $true -or $after.data.limit -ne $before.data.limit -or $null -ne $after.data.limit_reset) {
    throw 'Verification failed. Keep the app pilot locked and inspect the account settings.'
  }
  Write-Host 'Verified: BYOK is included. Existing total limit and no-reset setting are unchanged.'
  Write-Host 'Return to Creative Hook Lab and run the free connection check. No inference was executed.'
} catch {
  Write-Host 'The cap update could not be verified. No API response or credential is printed. Check management-key permissions and the target key hash.'
  exit 1
} finally {
  if ($headers) { $headers.Clear() }
  if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  $secret.Dispose()
}
