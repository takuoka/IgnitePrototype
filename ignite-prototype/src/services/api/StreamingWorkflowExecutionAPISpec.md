以下は、ストリーミングモードで動作するワークフロー実行APIの仕様書です。  
この仕様書では、リクエスト内容、レスポンスの全体構造、各イベントの意味やフィールド、サンプルレスポンス例、エラーコードなどを記載しています。

---

# ストリーミングワークフロー実行API 仕様書

## 1. 概要

本APIは、ワークフローを実行し、実行中の進捗や中間結果、最終結果をリアルタイムにクライアントへ送信するためのものです。  
レスポンスは、Server-Sent Events (SSE) 形式のストリーミングで返され、各チャンクは `data:` で始まり、2つの改行文字 `\n\n` で区切られます。

---

## 2. エンドポイントとリクエスト

- **エンドポイント**:  
  `POST /workflows/run`

- **リクエストヘッダー**:
  - `Authorization`: `Bearer {api_key}`
  - `Content-Type`: `application/json`

- **リクエストボディ (JSON)**:
  - `inputs`: ワークフロー実行に必要な入力変数をキー/値ペアで指定  
    - 例: `"currentLyric": "ユーザーが入力した歌詞のテキスト"`
  - `response_mode`: `"streaming"` を指定することで、リアルタイムストリーミング出力となる  
  - `user`: ユーザー識別子（例: `"user-<タイムスタンプ>"`）

### リクエスト例

```json
{
  "inputs": {
    "currentLyric": "ここに歌詞のテキストを入力"
  },
  "response_mode": "streaming",
  "user": "user-1740874417934"
}
```

---

## 3. ストリーミングレスポンスの基本形式

- **Content-Type**: `text/event-stream`
- 各チャンクは以下の形式で送信されます：
  ```
  data: { JSON文字列 }\n\n
  ```
- SSE形式のため、受信側は逐次読み取り、各チャンクのJSONをパースして処理します。

---

## 4. 各イベント種別とフィールド

### 4.1 `workflow_started`
- **目的**: ワークフローの実行開始を通知
- **主要フィールド**:
  - `task_id`: タスク追跡用の一意ID
  - `workflow_run_id`: ワークフロー実行全体のID
  - `event`: 固定値 `"workflow_started"`
  - `data`:
    - `id`: ワークフロー実行ID（同一）
    - `workflow_id`: 対象ワークフローのID
    - `sequence_number`: イベントの連番（通常1から開始）
    - `inputs`: 入力パラメータ（例: `currentLyric` など）
    - `created_at`: 開始タイムスタンプ

### 4.2 `node_started`
- **目的**: 個別の処理ノードの実行開始を通知
- **主要フィールド**:
  - `task_id`、`workflow_run_id`
  - `event`: 固定値 `"node_started"`
  - `data`:
    - `id`: ノード実行の一意ID
    - `node_id`: ノードのID
    - `node_type`: ノードの種類（例: `"start"`, `"llm"` など）
    - `title`: ノードの名称
    - `index`: 実行順序（シーケンス番号）
    - `predecessor_node_id`: （オプション）前のノードID
    - `inputs`: ノードに渡された入力（存在する場合）
    - `created_at`: ノード開始時刻

### 4.3 `node_finished`
- **目的**: ノードの実行完了（成功・失敗）を通知
- **主要フィールド**:
  - `task_id`、`workflow_run_id`
  - `event`: 固定値 `"node_finished"`
  - `data`:
    - `id`: ノード実行の一意ID
    - `node_id`: ノードのID
    - `node_type`: ノードの種類
    - `title`: ノード名称
    - `index`: 実行順序
    - `predecessor_node_id`: （オプション）前のノードID
    - `inputs`: 入力パラメータ
    - `process_data`: （オプション）実行中の追加データ（例: プロンプト情報）
    - `outputs`: （オプション）ノードの出力結果（生成テキストなど）
    - `status`: 実行状態（例: `"succeeded"`, `"failed"` など）
    - `error`: （オプション）エラー情報
    - `elapsed_time`: （オプション）処理時間（秒）
    - `created_at`: 開始時刻
    - `finished_at`: 終了時刻

### 4.4 `text_chunk`
- **目的**: 生成されたテキストの断片を逐次送信
- **主要フィールド**:
  - `task_id`、`workflow_run_id`
  - `event`: 固定値 `"text_chunk"`
  - `data`:
    - `text`: 送信されたテキストフラグメント
    - `from_variable_selector`: 出力元を示す識別情報（例: [ノードID, "text"]）

### 4.5 `tts_message` / `tts_message_end`
- **目的**: TTS（音声合成）関連の出力通知
- **tts_message**:
  - `task_id`、`message_id`
  - `audio`: base64エンコードされた音声データ（MP3形式）
  - `created_at`: タイムスタンプ
- **tts_message_end**:
  - 同様のフィールドで、`audio` は空文字（終了を示す）

### 4.6 `ping`
- **目的**: 接続を維持するための定期送信信号  
- **内容**: 追加のデータはなく、単に接続状態を維持するために送信される

---

## 5. エラーコード

- **400系エラー**:
  - `invalid_param`: 異常なパラメータ入力
  - `app_unavailable`: アプリ設定が利用できない
  - `provider_not_initialize`: モデル資格情報未設定
  - `provider_quota_exceeded`: クォータ不足
  - `model_currently_not_support`: 現在のモデル非対応
  - `workflow_request_error`: ワークフロー実行失敗
- **500系エラー**:
  - 内部サーバーエラー

---

## 6. 具体的なレスポンス例（時系列）

以下は、ワークフロー実行開始から終了までの一連のイベント例です。

### 6.1 Workflow Started

```json
data: {
  "event": "workflow_started",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "11a4xxx",
    "workflow_id": "b8060xxxxx",
    "sequence_number": 49,
    "inputs": {
      "currentLyric": "ねぇ\nどうaaaaaaaaaaaaafきろ\n\n"
    },
    "created_at": 1740874418
  }
}
```

### 6.2 Start Node - Node Started

```json
data: {
  "event": "node_started",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "25cxxxx",
    "node_id": "1739686615603",
    "node_type": "start",
    "title": "Startの歌詞",
    "index": 1,
    "created_at": 1740874418
  }
}
```

### 6.3 Start Node - Node Finished

```json
data: {
  "event": "node_finished",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "25cxxxx",
    "node_id": "1739686615603",
    "node_type": "start",
    "title": "Startの歌詞",
    "index": 1,
    "inputs": {
      "currentLyric": "ねぇ\nどうaaaaaaaaaaaaafきろ\n\n"
    },
    "status": "succeeded",
    "elapsed_time": 0.037095,
    "created_at": 1740874418,
    "finished_at": 1740874418
  }
}
```

### 6.4 LLM Node (アドバイス) - Node Started

```json
data: {
  "event": "node_started",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "e601e317-0bda-42e0-a524-9a3b98f42f09",
    "node_id": "1740815000104",
    "node_type": "llm",
    "title": "アドバイス",
    "index": 2,
    "predecessor_node_id": "1739686615603",
    "created_at": 1740874418
  }
}
```

### 6.5 LLM Node (アドバイス) - Text Chunks

```json
data: {
  "event": "text_chunk",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "text": "###",
    "from_variable_selector": ["1740815000104", "text"]
  }
}
```

```json
data: {
  "event": "text_chunk",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "text": " 作詩",
    "from_variable_selector": ["1740815000104", "text"]
  }
}
```

```json
data: {
  "event": "text_chunk",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "text": "の",
    "from_variable_selector": ["1740815000104", "text"]
  }
}
```

```json
data: {
  "event": "text_chunk",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "text": "アドバイス",
    "from_variable_selector": ["1740815000104", "text"]
  }
}
```

### 6.6 LLM Node (アドバイス) - Node Finished

```json
data: {
  "event": "node_finished",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "e601e317-0bda-42e0-a524-9a3b98f42f09",
    "node_id": "1740815000104",
    "node_type": "llm",
    "title": "アドバイス",
    "index": 2,
    "predecessor_node_id": "1739686615603",
    "inputs": { "#context#": "ねぇ\nどうaaaaaaaaaaaaafきろ\n\n" },
    "outputs": {
      "text": "### 作詩のアドバイス ✨\n\n1. **感情を大切に** ❤️\n..."
    },
    "status": "succeeded",
    "elapsed_time": 1.518152,
    "created_at": 1740874418,
    "finished_at": 1740874420
  }
}
```

### 6.7 次の LLM ノード (フレーズ) - Node Started and Text Chunks

```json
data: {
  "event": "node_started",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "6c5eaf9d-9fec-4b6f-b2a0-ab032d43c2e4",
    "node_id": "17408306918800",
    "node_type": "llm",
    "title": "フレーズ",
    "index": 3,
    "predecessor_node_id": "1740815000104",
    "created_at": 1740874420
  }
}
```

**テキストチャンク例**:
```json
data: {
  "event": "text_chunk",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "text": "\n1",
    "from_variable_selector": ["17408306918800", "text"]
  }
}
```
（以下、生成されたフレーズが複数の `text_chunk` イベントとして送信されます）

### 6.8 フレーズノード - Node Finished

```json
data: {
  "event": "node_finished",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "f662b864-11ea-4896-9d5e-29bf8b84b1f6",
    "node_id": "17408306918800",
    "node_type": "llm",
    "title": "フレーズ",
    "index": 3,
    "predecessor_node_id": "1740815000104",
    "inputs": { "#context#": "### 作詩のアドバイス ✨\n..." },
    "outputs": {
      "advice": "### 作詩のアドバイス ✨\n\n1. **感情を大切に** ❤️\n2. **シンプルに表現** 📝\n...",
      "phrases": "1. 夜空に漂う星の翼\n2. 風が運ぶ懐かしい声\n...",
      "words": "風のささやき、月の光、孤独な旅、..."
    },
    "status": "succeeded",
    "elapsed_time": 0.016134,
    "created_at": 1740874423,
    "finished_at": 1740874423
  }
}
```

### 6.9 End Node - Node Started and Finished

```json
data: {
  "event": "node_started",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "d2c74da5-7c2f-480b-b1e3-bc2460cfa22a",
    "node_id": "1740217455075",
    "node_type": "end",
    "title": "終了",
    "index": 5,
    "predecessor_node_id": "17408320537560",
    "created_at": 1740874423
  }
}
```

```json
data: {
  "event": "node_finished",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "d2c74da5-7c2f-480b-b1e3-bc2460cfa22a",
    "node_id": "1740217455075",
    "node_type": "end",
    "title": "終了",
    "index": 5,
    "predecessor_node_id": "17408320537560",
    "inputs": {
      "advice": "### 作詩のアドバイス ✨\n\n1. **感情を大切に** ❤️\n..."
    },
    "outputs": {
      "advice": "### 作詩のアドバイス ✨\n\n1. **感情を大切に** ❤️\n2. **シンプルに表現** 📝\n3. **ストーリーを持たせる** 📖\n4. **リズムを意識** 🎶\n5. **心に響く言葉選び** 💬\n\n自分の言葉で書いてみて！ 🌟",
      "phrases": "1. 夜空に漂う星の翼\n2. 風が運ぶ懐かしい声\n3. 夢の中で君と再会する\n...",
      "words": "風のささやき、月の光、孤独な旅、心の肖、夢のかけら、..."
    },
    "status": "succeeded",
    "elapsed_time": 4.808306537102908,
    "created_at": 1740874418,
    "finished_at": 1740874423
  }
}
```

### 6.10 Workflow Finished

```json
data: {
  "event": "workflow_finished",
  "workflow_run_id": "11a4xxx",
  "task_id": "c996xxx",
  "data": {
    "id": "11a4xxx",
    "workflow_id": "b8060xxxxx",
    "sequence_number": 49,
    "status": "succeeded",
    "outputs": {
      "advice": "### 作詩のアドバイス ✨\n\n1. **感情を大切に** ❤️\n2. **シンプルに表現** 📝\n3. **ストーリーを持たせる** 📖\n4. **リズムを意識** 🎶\n5. **心に響く言葉選び** 💬\n\n自分の言葉で書いてみて！ 🌟",
      "phrases": "1. 夜空に漂う星の翼\n2. 風が運ぶ懐かしい声\n3. 夢の中で君と再会する\n...",
      "words": "風のささやき、月の光、孤独な旅、心の肖、夢のかけら、..."
    },
    "error": null,
    "elapsed_time": 4.808306537102908,
    "total_tokens": 759,
    "total_steps": 5,
    "created_at": 1740874418,
    "finished_at": 1740874423
  }
}
```

---

## 【まとめ】

- **ワークフロー開始**: `workflow_started` イベントで実行開始が通知され、入力情報が送信される  
- **Start ノード**: `node_started` と `node_finished` により、最初のノードの処理開始と完了が確認される  
- **LLM ノード (アドバイス)**: `node_started` → 複数の `text_chunk` イベントで断片的なテキストが送信され、`node_finished` で完了結果が返される  
- **LLM ノード (フレーズ)**: 同様に、開始 (`node_started`)、テキストチャンク、終了 (`node_finished`)  
- **終了処理**: End ノードの `node_started` と `node_finished` を経て、最終的に `workflow_finished` で全体の完了が通知される

この仕様書および具体例を元に、開発者はストリーミングレスポンスのパース処理、UI更新ロジック、およびエラーハンドリングの実装・デバッグを行ってください。