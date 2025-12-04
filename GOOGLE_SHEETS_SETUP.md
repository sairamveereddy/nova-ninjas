# Google Sheets Integration Setup Guide 📊

This guide explains how to connect your Nova Ninjas dashboard to Google Sheets so employees can update job applications.

## 🎯 How It Works

1. **Employees** update a Google Sheet with job applications
2. **Website** automatically reads from the sheet
3. **Customers** see their real applications on their dashboard

---

## 📋 Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it: **Nova Ninjas Applications**
4. In **Row 1**, add these column headers:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| customer_email | company_name | job_title | status | application_link | submitted_date | notes |

### Example Data (Row 2 onwards):

```
alex@example.com | Google | Software Engineer | submitted | https://careers.google.com/123 | 2025-01-23 | Great match
alex@example.com | Meta | Frontend Developer | interview | https://careers.meta.com/456 | 2025-01-20 | Phone screen scheduled
maria@example.com | Amazon | Backend Engineer | found | https://amazon.jobs/789 | 2025-01-24 | Needs AWS experience
```

### Status Options:
- `found` - Job found, not yet applied
- `prepared` - Application being prepared
- `submitted` - Application submitted
- `interview` - Got interview
- `rejected` - Application rejected
- `offer` - Received offer

---

## 🔗 Step 2: Share the Sheet

1. Click the **Share** button (top right)
2. Click **"Anyone with the link"**
3. Set permission to **"Viewer"**
4. Click **Copy link**

From the URL, copy the **Sheet ID**:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID_IS_HERE]/edit
```

Example: If URL is `https://docs.google.com/spreadsheets/d/1ABC123xyz/edit`
Then Sheet ID is: `1ABC123xyz`

---

## 🔑 Step 3: Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Library**
4. Search for **"Google Sheets API"**
5. Click **Enable**
6. Go to **APIs & Services** → **Credentials**
7. Click **Create Credentials** → **API Key**
8. Copy the API key
9. (Optional) Click **Restrict Key** → Add restriction for "Google Sheets API"

---

## ⚙️ Step 4: Configure Your Backend

Add these to your `backend/.env` file:

```env
# Google Sheets Configuration
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_API_KEY=your_api_key_here
```

Example:
```env
GOOGLE_SHEET_ID=1ABC123xyz789
GOOGLE_API_KEY=AIzaSyB1234567890abcdefg
```

---

## 🚀 Step 5: Restart Backend

After adding the environment variables:

```bash
# If using local development
cd backend
pip install aiohttp
uvicorn server:app --reload

# If using production (Railway/Heroku)
# Just redeploy - it will pick up the new env vars
```

---

## 📱 API Endpoints

Once configured, these endpoints are available:

### Get User Applications
```
GET /api/applications/{user_email}
```

Response:
```json
{
  "applications": [
    {
      "company_name": "Google",
      "job_title": "Software Engineer",
      "status": "submitted",
      "application_link": "https://...",
      "submitted_date": "2025-01-23",
      "notes": "Great match"
    }
  ],
  "stats": {
    "total": 15,
    "this_week": 5,
    "interviews": 2,
    "hours_saved": 7.5
  }
}
```

### Get Dashboard Stats
```
GET /api/dashboard-stats/{user_email}
```

---

## 👥 Employee Instructions

Share this with your employees:

### How to Add Applications:

1. Open the Google Sheet (shared link)
2. Add a new row with:
   - **Column A**: Customer's email (must match their login email)
   - **Column B**: Company name
   - **Column C**: Job title
   - **Column D**: Status (found/prepared/submitted/interview/rejected/offer)
   - **Column E**: Application link
   - **Column F**: Date (YYYY-MM-DD format, e.g., 2025-01-23)
   - **Column G**: Notes (optional)

3. Save - changes appear on customer dashboard immediately!

### Tips:
- Use exact customer email (lowercase)
- Use date format: YYYY-MM-DD (e.g., 2025-01-23)
- Update status as application progresses
- Add notes for context

---

## 🧪 Testing

1. Add a test row with your email
2. Log into the dashboard
3. Check if applications appear
4. If not, check:
   - Sheet ID is correct
   - API key is correct
   - Sheet is shared as "Anyone with link"
   - Email in sheet matches login email

---

## ❓ Troubleshooting

### "No applications showing"
- Check the customer email in sheet matches exactly
- Verify sheet is shared publicly
- Check API key is enabled for Sheets API

### "API Error"
- Verify GOOGLE_SHEET_ID and GOOGLE_API_KEY in .env
- Restart the backend server
- Check Google Cloud Console for API quota

---

## 📊 Sample Sheet Template

Copy this template: [Create your own copy]

Or manually create with these headers:
```
customer_email | company_name | job_title | status | application_link | submitted_date | notes
```

That's it! Your employees can now update the Google Sheet and customers will see real data on their dashboard. 🎉



