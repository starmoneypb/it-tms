@echo off
echo 🗑️  Clearing existing tickets and seeding realistic sample data...
echo.
echo This will:
echo   ✅ Remove all existing tickets
echo   ✅ Clear all user scores and rankings
echo   ✅ Generate 14 realistic tickets with proper scoring
echo   ✅ Assign tickets to appropriate users
echo   ✅ Create completed tickets with score distribution
echo   ✅ Add realistic comments and timing
echo.

cd apps\api
echo Building seed script...
go build -o tmp\seed.exe .\cmd\seed

echo Running database seeding...
tmp\seed.exe

echo.
echo ✅ Realistic sample tickets have been seeded!
echo 🏆 Check the Dashboard to see user rankings with actual scores
echo 🎫 Browse /tickets to see the new realistic ticket data
pause
