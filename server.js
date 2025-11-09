const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");

const app = express();
const agent = new HttpsProxyAgent('http://127.0.0.1:7890');
app.use(cors());

app.get("/proxy", async (req, res) => {
  // 从 query 参数获取目标 URL，例如 /proxy?url=https://www.example.com
  const targetUrl = req.query.url;
  console.log(targetUrl);
  if (!targetUrl) {
    return res.status(400).json({ error: "缺少 url 参数" });
  }
  try {
    const response = await axios.get(targetUrl, {
      httpsAgent: agent,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log(response.data);
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ error: "代理请求失败", details: error.toString() });
  }
});

app.listen(3001, () => console.log("代理服务器运行在 http://localhost:3001"));
