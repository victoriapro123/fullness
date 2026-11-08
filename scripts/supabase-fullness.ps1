param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SupabaseArguments
)

$ErrorActionPreference = 'Stop'
$fullnessCliProfile = Join-Path $PSScriptRoot '..\supabase\cli-fullness.yaml'
& npx --no-install supabase --profile $fullnessCliProfile @SupabaseArguments
exit $LASTEXITCODE
