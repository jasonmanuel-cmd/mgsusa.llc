# Social Media Extraction Guide - Master Glass Solutions

**Status:** Automated scraping blocked by Facebook/Instagram anti-bot protection  
**Solution:** Manual extraction (faster & more reliable for this use case)  
**Time Required:** 20-30 minutes total

---

## 🚫 Why Automation Failed

Facebook and Instagram have advanced anti-scraping systems that detect and block automated browser access. This is intentional - they want to protect user data and control how their platform is accessed.

**Better approach:** Manually extract from your accounts (30 minutes) and I'll integrate everything (15 minutes).

---

## ✅ STEP 1: Extract Facebook Reviews (10 minutes)

### Where to Find Reviews

1. **Open:** https://www.facebook.com/profile.php?id=61590016589444
2. **Look for:** "Reviews" or "Recommendations" tab/section
3. **If not visible:** Scroll down - reviews are usually in the middle or bottom section

### What to Capture

For **each review**, copy:

```
Name: [Reviewer Full Name]
Rating: [1-5 stars] ⭐
Quote: [Exact review text, up to 150 characters]
Date: [Approximate month/year if visible]
Source: Facebook
```

### Example Review Capture

```
Name: John Smith
Rating: ⭐⭐⭐⭐⭐ (5 stars)
Quote: "Amazing service! They fixed our broken storefront window in 24 hours. Highly recommend!"
Date: June 2026
Source: Facebook
```

### Goal: Collect 3-5 Reviews

Aim for a mix of:
- [ ] At least one 5-star review
- [ ] At least one recent review (last 3 months)
- [ ] Mix of residential and commercial feedback if available

### Copy-Paste Template

Once you collect reviews, paste them in this format in a text file:

```
FACEBOOK REVIEWS
================

Review 1:
Name: [Name]
Rating: [Stars]
Quote: "[Quote]"
Date: [Date]

Review 2:
Name: [Name]
Rating: [Stars]
Quote: "[Quote]"
Date: [Date]

Review 3:
Name: [Name]
Rating: [Stars]
Quote: "[Quote]"
Date: [Date]
```

---

## ✅ STEP 2: Extract Instagram Videos (10 minutes)

### Where to Find Videos

1. **Open:** https://www.instagram.com/masterglasssolutions_/
2. **Look for:** Reels section or Posts with video thumbnails
3. **Goal:** Find 2-3 latest professional videos

### What to Capture

For **each video**, note:

```
Post Type: [Reel / Post / Story]
URL: [Full Instagram post URL]
Description: [Caption/description from post]
Video Content: [What the video shows - e.g., "Glass installation, door opening"]
Post Date: [When posted - approximate]
Engagement: [Any visible metrics - likes, comments]
Quality: [Professional/High Quality?]
```

### How to Get Instagram Post URLs

#### Method A: Right-click (Easiest)

1. **Navigate to the post** on Instagram
2. **Right-click on the video thumbnail**
3. **Select:** "Copy link" or "Copy post URL"
4. **Paste into notepad**

Example URL format:
```
https://www.instagram.com/p/ABCD1234567/
```

#### Method B: Manual URL Construction

If Method A doesn't work:
1. Click on the post to open it
2. Look at the browser address bar
3. Copy the full URL
4. Paste into notepad

### Example Video Capture

```
Post Type: Reel
URL: https://www.instagram.com/p/ABCD1234567/
Description: "Professional glass installation - watch the magic happen! 🪟✨"
Video Content: Time-lapse of commercial glass installation, door opening
Post Date: July 2026
Engagement: 150+ likes
Quality: ✅ High quality - professional shooting
```

### Copy-Paste Template

```
INSTAGRAM VIDEOS
================

Video 1:
Post Type: [Reel/Post]
URL: [URL]
Description: "[Description]"
Video Content: [What it shows]
Post Date: [Date]
Quality: [Professional/High Quality?]

Video 2:
Post Type: [Reel/Post]
URL: [URL]
Description: "[Description]"
Video Content: [What it shows]
Post Date: [Date]
Quality: [Professional/High Quality?]

Video 3:
Post Type: [Reel/Post]
URL: [URL]
Description: "[Description]"
Video Content: [What it shows]
Post Date: [Date]
Quality: [Professional/High Quality?]
```

---

## ✅ STEP 3: Download Instagram Videos (Optional, 10 minutes)

### Option A: Use Online Downloader (Easiest)

If you want **local video files** (rather than embedded links):

1. **Go to:** https://www.saveig.app/
2. **Paste Instagram post URL** into the search box
3. **Click Download**
4. **Save to:** `C:\Users\blunt\Desktop\Weatabases\mgsusa.llc\master-glass-site\assets\videos\`
5. **Rename file:** 
   - `instagram-reel-1.mp4`
   - `instagram-reel-2.mp4`
   - `instagram-reel-3.mp4`

### Option B: Use Command Line (If Downloaded)

Once you have the MP4 files locally, check file size:

```bash
cd C:\Users\blunt\Desktop\Weatabases\mgsusa.llc\master-glass-site\assets\videos\
ls -lh instagram-reel-*.mp4
```

If any file is > 5MB, compress it:

```bash
ffmpeg -i instagram-reel-1.mp4 -vcodec libx264 -crf 28 instagram-reel-1-compressed.mp4
```

### Option C: Just Use the Links (Recommended for Speed)

Skip downloads entirely and embed the Instagram URLs directly in the HTML. Instagram will handle streaming. This is faster and doesn't use your disk space.

---

## 📋 COLLECTION CHECKLIST

- [ ] **Facebook reviews collected:** 3-5 reviews with Name, Rating, Quote, Date
- [ ] **Instagram videos identified:** 2-3 video URLs collected
- [ ] **Video content documented:** Type, description, quality noted for each
- [ ] **Files saved to notepad or text file** for easy copy-paste
- [ ] **Ready to hand off to OpenCode** for integration

---

## 🎯 What Happens Next (After You Collect Data)

Once you send me the reviews and video info, I will:

1. **Format Facebook reviews** into production HTML markup
2. **Embed Instagram videos** with proper responsive sizing
3. **Update `index.html`** to replace placeholder sections
4. **Add CSS styling** for reviews and video gallery
5. **Test on mobile & desktop** for responsiveness
6. **Deploy and verify** everything works

---

## ⏱️ Timeline

- **You collect reviews & videos:** 20-30 minutes
- **I integrate everything:** 15-20 minutes
- **Total ready for production:** ~50 minutes

---

## 📌 Pro Tips

### Finding Good Reviews
- ⭐ Prefer **recent reviews** (last 3 months = more credible)
- ⭐ Prefer **specific reviews** (mention actual service: "window repair," "emergency glass," etc.)
- ⭐ Prefer **long reviews** (100+ characters shows they took time)
- ❌ Avoid generic praise ("great company!") - specificity wins

### Finding Good Videos
- 🎬 **Recent is better** (July 2026 > January 2026)
- 🎬 **Professional quality** > phone videos
- 🎬 **Action-oriented** > static talks (installations, repairs, before/after)
- 🎬 **Authentic** > overly polished (real work looks good)

### Formatting Tips
- Use **exact quotes** from reviews (don't paraphrase)
- Include **reviewer name** when available (adds credibility)
- **Copy URLs exactly** - one typo breaks the link
- **Document post dates** - helps with freshness signals

---

## 🚨 Common Issues

### "I don't see a Reviews tab on Facebook"

Try these:
1. **Scroll down** the page - reviews are often below the cover photo
2. **Look for "Recommendations"** - Facebook sometimes labels them this way
3. **Check if reviews are enabled** - the business owner can disable them

### "Instagram URL is super long with extra params"

That's fine! Just copy the whole thing. Instagram will clean it up.

### "The video is huge (> 100MB)"

Just note the URL for now. I can optimize it later. Don't spend time compressing.

---

## ✅ Ready to Hand Off?

Once you've collected everything, just send me:

**Via Chat:**
```
FACEBOOK REVIEWS:
[Paste your reviews here]

INSTAGRAM VIDEOS:
[Paste your video info here]

VIDEO FILES:
[Did you download local files? Yes/No]
```

**I'll take it from there!** ✨

