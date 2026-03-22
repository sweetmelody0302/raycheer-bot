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
      console.error('Webhook 總體錯誤:', err);
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
    // 這裡針對 Dify 聊天流 (Chatflow) 進行最相容的格式調整
    const difyResponse = await axios.post('https://api.dify.ai/v1/chat-messages', {
      // 如果你在 Dify 開始節點有設定變數，這裡 inputs 裡面就要帶入
      inputs: {
        "query": userMessage 
      },
      query: userMessage, 
      user: userId,
      response_mode: "blocking"
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
    // 【重點】這行會在 Zeabur 日誌直接印出 Dify 討厭你哪一點
    if (error.response) {
      console.log('Dify 拒絕原因:', JSON.stringify(error.response.data));
    } else {
      console.log('連線錯誤:', error.message);
    }
    
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '系統處理中，請稍後再試！'
    });
  }
}

const port = process.env.PORT || 8080; 
app.listen(port, () => {
  console.log(`瑞智文教接線生已啟動！`);
});
