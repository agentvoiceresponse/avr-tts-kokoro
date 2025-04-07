# Agent Voice Response - Kokoro Text-to-Speech Integration

This project demonstrates the integration of **Agent Voice Response** with **Kokoro Text-to-Speech (TTS)**. The application sets up an Express.js server that accepts a text string from a client via HTTP POST requests, converts the text into speech using Kokoro TTS, and streams the audio back to the client in real-time. The audio is automatically downsampled from 24kHz to 8kHz for compatibility with AVR systems.

## Prerequisites

To run this project, you will need:

1. **Node.js** and **npm** installed.
2. A running instance of **Kokoro TTS** server.
3. Network access to the Kokoro TTS server.

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/agentvoiceresponse/avr-tts-kokoro
cd avr-tts-kokoro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Kokoro Settings

Set the environment variables to configure your Kokoro TTS connection in your Node.js application:

```bash
export KOKORO_BASE_URL="http://your-kokoro-server:8880"
export KOKORO_VOICE="af_alloy"
export KOKORO_SPEED="1.3"
```

Alternatively, use a `.env` file to load environment variables:

```bash
KOKORO_BASE_URL="http://your-kokoro-server:8880"
KOKORO_VOICE="af_alloy"
KOKORO_SPEED="1.3"
PORT=6012
```

### 4. Configure Environment Variables

Make sure you have the following environment variables set in a `.env` file for flexible configuration:

```bash
KOKORO_BASE_URL="http://your-kokoro-server:8880"
KOKORO_VOICE="af_alloy"
KOKORO_SPEED="1.3"
PORT=6012
```

You can modify the voice and speed settings based on your requirements.

## How It Works

The application accepts a text input from the client via an HTTP POST request to the `/text-to-speech-stream` route, converts the text into speech using **Kokoro Text-to-Speech**, and streams the resulting audio back in `LINEAR16` encoding at 8kHz, suitable for integration with **Asterisk Audio Socket**.

### Key Components

- **Express.js Server**: Handles incoming HTTP POST requests with the text body and streams the audio back to the client.
- **Kokoro Text-to-Speech Client**: Converts text into speech using the TTS API.
- **Audio Processing**: Includes a downsampling function that converts 24kHz audio to 8kHz using linear interpolation.
- **Audio Streaming**: The audio data is processed and streamed back to the client in 320-byte chunks for real-time playback.

### Example Code Overview

- **Kokoro TTS Request Configuration**: Set up voice settings like voice model and speed.
- **Audio Processing**: The application includes a sophisticated downsampling algorithm that maintains audio quality while converting from 24kHz to 8kHz.
- **Audio Streaming**: The processed audio is split into chunks and streamed back to the client using the `res.write()` method.

## Running the Application

To start the application:

```bash
node index.js
```

The server will start and listen on the port defined in the environment variable or default to `6012`.

### Sending a Text Request

You can use `curl` to send a POST request to the server with a JSON body containing a `text` field:

```bash
curl -X POST http://localhost:6012/text-to-speech-stream \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello, welcome to Agent Voice Response!"}' --output response.raw
```

The audio response will be saved in `response.raw` in LINEAR16 format at 8kHz.