$body = @{
  questionId = "pte-wrt-001"
  exam = "PTE"
  skill = "writing"
  typeId = "summarize-written-text"
  textResponse = "Because dense urban surfaces absorb heat and elevate both energy costs and health risks, municipal planners are implementing reflective materials, green roofs, and expanded tree canopies to mitigate urban heat island effects."
  timeSpentSeconds = 60
} | ConvertTo-Json

Write-Host "Calling Go Backend Practice API..."
$res = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/practice" -Method Post -Body $body -ContentType "application/json"
Write-Host "Success: $($res.success)" -ForegroundColor Green
Write-Host "Score: $($res.evaluation.score)/$($res.evaluation.maxScore)" -ForegroundColor Green
Write-Host "Summary: $($res.evaluation.feedback)" -ForegroundColor Cyan
Write-Host "XP Awarded: +$($res.xpAwarded) XP" -ForegroundColor Yellow

# Test AI Tutor on Go
$tutorBody = @{
  messages = @(
    @{ role = "user"; content = "Give me the Describe Image template" }
  )
  exam = "PTE"
} | ConvertTo-Json

Write-Host "`nCalling Go Backend AI Tutor API..."
$tutorRes = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/ai/tutor" -Method Post -Body $tutorBody -ContentType "application/json"
Write-Host "Tutor Reply: $($tutorRes.reply.Substring(0, 120))..." -ForegroundColor Cyan
