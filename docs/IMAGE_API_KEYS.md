# How to get image API keys (Unsplash, Pexels, OpenAI)

Add these to your **`.env.local`** so the video pipeline uses real images instead of the placeholder. You need **at least one** of Unsplash or Pexels; OpenAI DALL·E is optional (used when stock search fails).

---

## 1. Unsplash (recommended first - free, good for stock photos)

1. Go to **https://unsplash.com/oauth/applications**
2. Sign in or create an Unsplash account.
3. Click **“New Application”** and accept the API use terms.
4. Give the app a name (e.g. “Cutline”) and create it.
5. In the app dashboard, find **“Keys”** → **Access Key** (or **Production**).
6. Copy the **Access Key** (long string).
7. In your project root, open **`.env.local`** and add:
   ```bash
   UNSPLASH_ACCESS_KEY=paste_your_access_key_here
   ```
   Replace `paste_your_access_key_here` with the key you copied.

**Rate limits:** Free tier has a limit (e.g. 50 requests/hour). Enough for testing and light use.

---

## 2. Pexels (free backup - good if Unsplash fails or hits limits)

1. Go to **https://www.pexels.com/api/**
2. Sign in or create a Pexels account.
3. On the API page, click **“Get API Key”** or **“Generate API Key”**.
4. Copy the API key they show you.
5. In **`.env.local`** add:
   ```bash
   PEXELS_API_KEY=paste_your_api_key_here
   ```

**Rate limits:** Free tier allows a limited number of requests per hour. Used as fallback when Unsplash doesn’t return a good image.

---

## 3. OpenAI DALL·E 3 (optional - paid, used when stock fails)

Used when Unsplash and Pexels don’t return a good image for a shot. Generates an image from the shot’s text prompt (e.g. “Energy drink can on table”).

1. Go to **https://platform.openai.com/api-keys**
2. Sign in or create an OpenAI account.
3. Click **“Create new secret key”**, name it (e.g. “Cutline”), and copy the key.
4. In **`.env.local`** add:
   ```bash
   OPENAI_API_KEY=sk-proj-...paste_your_key_here
   ```

**Cost:** DALL·E 3 is paid per image. You only need this if you want AI-generated images when stock doesn’t have a good match.

---

## After adding keys

1. Save **`.env.local`**.
2. **Restart the worker** (the process that runs `npm run worker`). Env vars are read at startup.
3. Run a new video generation. You should see real images (e.g. energy drink photos) instead of the black placeholder.

**Example `.env.local` snippet** (only the image-related lines):

```bash
# Image APIs - add at least one of Unsplash or Pexels
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
PEXELS_API_KEY=your_pexels_api_key
# Optional: for AI-generated images when stock fails
OPENAI_API_KEY=sk-proj-your_openai_key
```

Never commit `.env.local` or share these keys; they’re already in `.gitignore`.
