const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
require('dotenv').config();

const app = express();

const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(lineConfig);

app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;

  try {
    // 這裡針對 Dify 聊天流 (Chatflow) 的 API 格式進行修正
    const difyResponse = await axios.post('https://api.dify.ai/v1/chat-messages', {
      inputs: {},            // 聊天流必填項目
      query: userMessage,    // 使用者訊息
      user: userId,          // 使用者識別碼
      response_mode: "blocking",
      files: []              // 增加這個確保相容性
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiReply = difyResponse.data.answer;

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: aiReply
    });

  } catch (error) {
    // 輸出詳細錯誤讓老闆好抓蟲
    console.error('Dify API Error Details:', error.response ? error.response.data : error.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '小編正在思考中，請稍後再試！'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`瑞智文教接線生已啟動！`);
});
