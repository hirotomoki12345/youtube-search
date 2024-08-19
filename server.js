const express = require("express");
const youtubedl = require("youtube-dl-exec");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();
const port = 3503;

const apiKey = process.env.API_KEY;
const youtube = google.youtube({
  version: "v3",
  auth: apiKey,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

function cleanYouTubeUrl(url) {
  try {
    const parsedUrl = new URL(url);
    let videoId = null;

    if (parsedUrl.hostname === "youtu.be") {
      videoId = parsedUrl.pathname.slice(1);
    } else if (
      parsedUrl.hostname === "www.youtube.com" ||
      parsedUrl.hostname === "youtube.com" ||
      parsedUrl.hostname === "m.youtube.com"
    ) {
      videoId = parsedUrl.searchParams.get("v");
    }

    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  } catch (error) {
    return null;
  }
}

function generateRandomFileName(extension) {
  return crypto.randomBytes(5).toString("hex") + extension;
}

app.get("/video-info", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URLクエリパラメータが必要です" });
  }

  const cleanUrl = cleanYouTubeUrl(url);
  if (!cleanUrl) {
    return res.status(400).json({ error: "無効なYouTube URLです" });
  }

  try {
    const output = await youtubedl(cleanUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });
    res.json(output);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "エラーが発生しました" });
  }
});

app.get("/mp4", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URLクエリパラメータが必要です" });
  }

  const cleanUrl = cleanYouTubeUrl(url);
  if (!cleanUrl) {
    return res.status(400).json({ error: "無効なYouTube URLです" });
  }

  try {
    const fileName = generateRandomFileName(".mp4");
    const tempFilePath = path.join(__dirname, fileName);

    await youtubedl(cleanUrl, {
      output: tempFilePath,
      format: "mp4", // Explicitly specify MP4 format
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    res.download(tempFilePath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "ダウンロード中にエラーが発生しました" });
      } else {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error(err);
        });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "エラーが発生しました" });
  }
});

app.get("/mp3", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URLクエリパラメータが必要です" });
  }

  const cleanUrl = cleanYouTubeUrl(url);
  if (!cleanUrl) {
    return res.status(400).json({ error: "無効なYouTube URLです" });
  }

  try {
    const fileName = generateRandomFileName(".mp3");
    const tempFilePath = path.join(__dirname, fileName);

    await youtubedl(cleanUrl, {
      output: tempFilePath,
      extractAudio: true,
      audioFormat: "mp3", // Specify MP3 format for audio extraction
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    res.download(tempFilePath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "ダウンロード中にエラーが発生しました" });
      } else {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error(err);
        });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "エラーが発生しました" });
  }
});

app.get("/search", async (req, res) => {
  const query = req.query.text || "";
  const pageToken = req.query.pageToken || "";

  try {
    const response = await youtube.search.list({
      part: "snippet",
      q: query,
      maxResults: 5,
      type: "video",
      pageToken: pageToken,
    });

    const results = response.data.items.map((item) => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails.high.url,
    }));

    res.json({
      results: results,
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error) {
    console.error("Error searching YouTube:", error);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
