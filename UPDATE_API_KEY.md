# How to Update OpenAI API Key

## Quick Fix

1. Open `amplify/team-provider-info.json`
2. Find line 25: `"openaiApiKey": "REMOVED_FOR_SECURITY",`
3. Replace with your actual API key: `"openaiApiKey": "sk-proj-YOUR_ACTUAL_KEY_HERE",`
4. Save the file
5. Run: `amplify push -y`

## Verify

After pushing, test the video analysis. It should work now.

## Security Note

The `team-provider-info.json` file is now in `.gitignore` so your real API key won't be committed to git.



