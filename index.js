/**
 * index.js
 * Text-to-Speech service using Kokoro for audio generation
 * and converting it to AVR-compatible format (8kHz, 16-bit mono PCM)
 * 
 * @author AgentVoiceResponse
 * @see https://www.agentvoiceresponse.com
 */

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

/**
 * Downsamples PCM audio from 22050Hz/24000Hz to 8kHz
 * Uses linear interpolation to maintain audio quality
 * 
 * @param {Buffer} buffer - Input PCM buffer (16-bit mono)
 * @param {number} inputSampleRate - Input sample rate (22050 or 24000)
 * @returns {Buffer} - Downsampled PCM buffer (16-bit mono at 8kHz)
 */
const downsampleTo8kHz = (buffer, inputSampleRate) => {
  const inputSamples = buffer.length / 2;
  const ratio = inputSampleRate / 8000;
  const outputSamples = Math.floor(inputSamples / ratio);
  const output = Buffer.alloc(outputSamples * 2);

  // Pre-calculate indices for performance optimization
  const indices = new Float32Array(outputSamples);
  for (let i = 0; i < outputSamples; i++) {
    indices[i] = i * ratio;
  }

  // Process samples in batch for better performance
  for (let i = 0; i < outputSamples; i++) {
    const inputIndex = indices[i];
    const index1 = Math.floor(inputIndex);
    const index2 = Math.min(index1 + 1, inputSamples - 1);
    const fraction = inputIndex - index1;
    
    const sample1 = buffer.readInt16LE(index1 * 2);
    const sample2 = buffer.readInt16LE(index2 * 2);
    
    // Optimized linear interpolation
    const interpolatedSample = Math.round(sample1 + (sample2 - sample1) * fraction);
    output.writeInt16LE(interpolatedSample, i * 2);
  }

  return output;
};

/**
 * Handles HTTP POST requests for text-to-speech conversion
 * 
 * @param {express.Request} req - HTTP request
 * @param {express.Response} res - HTTP response
 */
const handleTextToSpeech = async (req, res) => {
  // Input validation
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ 
      message: "Text is required and must be a non-empty string" 
    });
  }

  // Configure headers for PCM audio streaming
  res.setHeader("Content-Type", "audio/l16");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Configure Kokoro request
    const kokoroBaseUrl = process.env.KOKORO_BASE_URL || "http://localhost:8880";
    const requestConfig = {
      method: "post",
      url: `${kokoroBaseUrl}/v1/audio/speech`,
      data: {
        input: text.trim(),
        voice: process.env.KOKORO_VOICE || "af_alloy",
        response_format: "wav",
        speed: process.env.KOKORO_SPEED || "1.3"
      },
      responseType: "stream",
      timeout: 30000 // 30 seconds timeout
    };

    console.log("Kokoro Configuration:", requestConfig);

    const response = await axios(requestConfig);
    const chunks = [];

    // Handle audio streaming
    response.data.on("data", (chunk) => chunks.push(chunk));

    response.data.on("end", () => {
      try {
        const dataArray = Buffer.concat(chunks);
        console.log(`Total audio data: ${dataArray.length} bytes`);

        const downsampledBuffer = downsampleTo8kHz(dataArray, 24000);
        console.log(`Downsampled audio data: ${downsampledBuffer.length} bytes`);

        // Send audio in 320-byte chunks to optimize memory usage
        const CHUNK_SIZE = 320;
        for (let i = 0; i < downsampledBuffer.length; i += CHUNK_SIZE) {
          res.write(downsampledBuffer.slice(i, i + CHUNK_SIZE));
        }
        
        res.end();
      } catch (error) {
        console.error("Error processing audio:", error);
        res.status(500).json({ message: "Error processing audio" });
      }
    });

    response.data.on("error", (error) => {
      console.error("Error streaming audio:", error);
      res.status(500).json({ message: "Error streaming audio" });
    });
  } catch (error) {
    console.error("Error calling Kokoro TTS API:", error.message);
    res.status(500).json({ 
      message: "Error communicating with Kokoro TTS",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Main route
app.post("/text-to-speech-stream", handleTextToSpeech);

// Start server
const port = process.env.PORT || 6012;
app.listen(port, () => {
  console.log(`Kokoro Text-to-Speech service listening on port ${port}`);
});
