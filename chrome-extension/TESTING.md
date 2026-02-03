# JobNinjas Extension: Testing Instructions

## ✅ Backend API is Now Live!

The match score API endpoint has been added to `server.py` and pushed to production.

---

## How to Test the Extension

### Step 1: Reload Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Find **"jobNinjas: AI Job Copilot"**
3. Click the **circular reload icon** ⟲ (NOT browser refresh!)
4. Check for errors in the extension console

### Step 2: Test LinkedIn Match Score

1. **Sign in to LinkedIn** in your browser
2. **Sign in to JobNinjas** extension (click the floating ninja button)
3. Visit any LinkedIn job posting, for example:
   - `https://www.linkedin.com/jobs/view/XXXXX`
4. **Wait 2-3 seconds** for the widget to appear
5. You should see:
   - JobNinjas floating widget in top-right corner
   - Match score circle (colored green/yellow/red)
   - "X out of Y keywords present"
   - "Tailor Resume" button

**If widget doesn't appear:**
- Open DevTools Console (F12)
- Look for errors starting with `[jobNinjas]`
- Check if API call failed (401 = not authenticated, 404 = endpoint missing)

### Step 3: Test Autofill on Job Applications

1. Go to any job application form (Greenhouse, Workday, Lever, iCIMS)
2. Click the floating **ninja button** to open extension panel
3. Click **"Autofill"** button
4. Watch for:
   - "Scanning fields..." message (~1-2 seconds)
   - "Found X fields" message
   - Rapid field filling with progress updates
   - Field checklist showing filled items
   - Completion percentage increasing

**Test URLs:**
- Greenhouse: `https://boards.greenhouse.io/`
- Workday: `https://COMPANY.myworkdayjobs.com/`
- Lever: `https://jobs.lever.co/`

### Step 4: Check Branding

1. Open extension panel
2. Verify all buttons are **JobNinjas blue** (#00ced1)
3. Check hover effects (buttons should lift slightly)
4. Verify ninja emoji logo appears

---

## Troubleshooting

### Widget Not Showing on LinkedIn

**Check:**
1. Is backend deployed and running?
2. Are you signed into the JobNinjas extension?
3. Open DevTools Console - any errors?
4. Is the URL actually a LinkedIn job page? (Must contain `/jobs/view/` or `/jobs/collections/`)

**Quick Test:**
Run this in Console on LinkedIn job page:
```javascript
console.log('Is job page:', window.location.href.includes('linkedin.com/jobs/view/'));
```

### Autofill Not Working

**Check:**
1. Is `autofill-engine-v2.js` loaded? Check in Network tab or Sources
2. Open Console and run: `typeof window.AutofillEngineV2`
   - Should return `"function"`, not `"undefined"`
3. Are there visible form fields on the page?

### API Errors (401, 404, 500)

- **401 Unauthorized**: Sign in to JobNinjas extension
- **404 Not Found**: Backend needs redeployment (endpoint missing)
- **500 Server Error**: Check backend logs for Python errors

---

## What Success Looks Like

### LinkedIn Widget ✅
![JobNinjas Match Widget with score circle and blue gradient button]

### Autofill Progress ✅  
- Scans all fields first
- Shows progress bar updating
- Lists filled fields as tags
- Completes with "Go to Next Step" button

### Branding ✅
- All buttons use JobNinjas blue (#00ced1)
- Smooth hover animations
- Professional, premium feel

---

## Files Changed

**Frontend (Extension):**
- `chrome-extension/src/content/linkedin-matcher.js` - NEW
- `chrome-extension/src/content/autofill-engine-v2.js` - NEW
- `chrome-extension/manifest.json` - MODIFIED
- `chrome-extension/src/content/content.js` - MODIFIED
- `chrome-extension/src/sidepanel/sidepanel.css` - MODIFIED

**Backend:**
- `backend/server.py` - MODIFIED (added `/api/jobs/match-score`)

All changes have been pushed to GitHub! 🚀
