$endpoints = @(
  "http://localhost:3000",
  "http://localhost:3000/dashboard",
  "http://localhost:3000/practice",
  "http://localhost:3000/mocks",
  "http://localhost:3000/evaluations",
  "http://localhost:3000/mistakes",
  "http://localhost:3000/leaderboard",
  "http://localhost:3000/subscription",
  "http://localhost:3000/profile",
  "http://localhost:3000/admin",
  "http://localhost:3000/api/v1/auth",
  "http://localhost:3000/api/v1/exams",
  "http://localhost:3000/api/v1/questions?exam=PTE",
  "http://localhost:3000/api/v1/questions?exam=IELTS",
  "http://localhost:3000/api/v1/mocks?exam=PTE",
  "http://localhost:3000/api/v1/leaderboards",
  "http://localhost:3000/api/v1/subscriptions",
  "http://localhost:3000/api/v1/notifications",
  "http://localhost:3000/api/v1/admin"
)

Write-Host "========================================="
Write-Host "PREPYO MVP ENDPOINT VERIFICATION SUITE"
Write-Host "========================================="

$passCount = 0
$failCount = 0

foreach ($url in $endpoints) {
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
    Write-Host "[SUCCESS] $($resp.StatusCode) OK - $url" -ForegroundColor Green
    $passCount++
  } catch {
    Write-Host "[FAILURE] $url - $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
  }
}

Write-Host "-----------------------------------------"
Write-Host "Test Results: $passCount Passed, $failCount Failed"

# Test POST Endpoints
Write-Host "`nTesting Interactive REST APIs..."

# 1. Test Practice Submission
$body = @{
  questionId = "pte-rdg-001"
  exam = "PTE"
  skill = "reading"
  typeId = "fill-in-blanks-rw"
  blankResponses = @{
    blank1 = "confusion"
    blank2 = "debunked"
    blank3 = "enhances"
    blank4 = "efficiency"
  }
  timeSpentSeconds = 45
} | ConvertTo-Json

$practiceRes = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/practice" -Method Post -Body $body -ContentType "application/json"
Write-Host "[API TEST] Practice Evaluation: Score = $($practiceRes.evaluation.score)/$($practiceRes.evaluation.maxScore), XP = +$($practiceRes.xpAwarded)" -ForegroundColor Cyan

# 2. Test AI Tutor Chat
$tutorBody = @{
  messages = @(
    @{ role = "user"; content = "Give me the Describe Image template" }
  )
  exam = "PTE"
} | ConvertTo-Json

$tutorRes = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/ai/tutor" -Method Post -Body $tutorBody -ContentType "application/json"
Write-Host "[API TEST] AI Tutor Reply Received ($($tutorRes.reply.Length) chars)" -ForegroundColor Cyan

# 3. Test Subscription Upgrade
$subBody = @{
  planId = "pro"
  paymentGateway = "eSewa"
} | ConvertTo-Json

$subRes = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/subscriptions" -Method Post -Body $subBody -ContentType "application/json"
Write-Host "[API TEST] Nepal Subscription Upgrade: $($subRes.message)" -ForegroundColor Cyan
