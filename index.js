// 引入必要的套件
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
require('dotenv').config();

const app = express();

// 1. 設定 LINE 的通行證 (從雲端環境變數讀取)
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(lineConfig);

// 2. 建立 Webhook 接收點，用來接收 LINE 傳來的訊息
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Webhook 錯誤:', err);
      res.status(500).end();
    });
});

// 3. 處理每一則訊息
async function handleEvent(event) {
  // 如果不是文字訊息，直接略過
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;

  try {
    // 4. 將客戶訊息傳送給 Dify (瑞智文教大腦)
    const difyResponse = await axios.post('https://api.dify.ai/v1/chat-messages', {
      inputs: {},          
      query: userMessage,  
      response_mode: "blocking",
      conversation_id: "", 
      user: userId         
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // 5. 取得 Dify 回傳的解答
    const aiReply = difyResponse.data.answer;

    // 6. 透過 LINE 回傳給客戶
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: aiReply
    });

  } catch (error) {
    console.error('Dify 連線錯誤:', error.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '系統處理中，請稍後再試。'
    });
  }
}

// 7. 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`瑞智文教接線生已啟動在 port ${port}`);
});
