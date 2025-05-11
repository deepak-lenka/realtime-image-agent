# Real-time AI Image Generation Voice Agent

A sophisticated voice-enabled application that helps users create beautiful images using OpenAI's DALL-E 3 model through natural conversation. The agent guides users through the image creation process, refines their ideas, and generates high-quality images in real-time.



## Features

- **Voice-Driven Interface**: Interact with the AI assistant using your voice for a natural conversation experience
- **Iterative Image Refinement**: The agent asks thoughtful questions to help refine your image concept
- **Real-Time Image Generation**: Generate images using OpenAI's DALL-E 3 model (or GPT-image-1) with a simple voice command
- **Modern UI**: Beautiful, responsive interface with real-time feedback and image display
- **Push-to-Talk Mode**: Option to use push-to-talk for more controlled interactions

## Setup

- This is a Next.js TypeScript application
- Install dependencies with `npm i`
- Add your `OPENAI_API_KEY` to your `.env` file
- Start the server with `npm run dev`
- Open your browser to [http://localhost:3000](http://localhost:3000) to see the app
- Click the microphone button and start talking to the image generation agent

## Image Generation Agent Configuration

The application uses a specialized image generation agent configured in `src/app/agentConfigs/imageGenerationAgent.ts`. This agent is designed to guide users through the image creation process and generate high-quality images using DALL-E 3 or GPT-image-1.

```typescript
import { AgentConfig } from "@/app/types";

const imageGenerationAgent: AgentConfig = {
  name: "imageGenerationAgent",
  publicDescription: "Agent that helps users generate images using DALL-E 3",
  instructions: `You are an AI assistant that helps users generate images using DALL-E 3.
    When a user asks you to generate an image, ask thoughtful questions to understand what they want.
    Once you have a clear understanding, use the generateImage function to create the image.
    Be creative and helpful in guiding users to refine their image ideas.`,
  tools: [
    {
      name: "generateImage",
      description: "Generate an image using DALL-E 3",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Detailed description of the image to generate",
          },
        },
        required: ["prompt"],
      },
    },
  ],
  toolLogic: {
    generateImage: async (args) => {
      // The actual image generation is handled by the API endpoint
      return { success: true };
    },
  },
};

export default [imageGenerationAgent];
```

### How It Works

1. **User Interaction**: The user speaks to the agent about what kind of image they want to create
2. **Prompt Refinement**: The agent asks questions to help refine the image concept
3. **Image Generation**: When ready, the agent calls the `generateImage` function with a detailed prompt
4. **API Processing**: The prompt is sent to the `/api/images/generate` endpoint, which calls the OpenAI image generation API (DALL-E 3 by default)
5. **Display**: The generated image is displayed in the UI for the user to see

### Customizing the Agent

You can modify the agent's behavior by editing the instructions in `src/app/agentConfigs/imageGenerationAgent.ts`. For example, you can:

- Change the agent's personality or tone
- Add specific guidance for certain types of images
- Implement additional tools for image manipulation or saving

## User Interface

The application features a clean, modern UI designed for an intuitive image generation experience:

- **Conversation Panel**: The left side displays the conversation transcript between you and the AI assistant
- **Image Display**: Generated images appear prominently in the center of the screen
- **Control Bar**: The bottom toolbar provides controls for:
  - Microphone toggle (Push-to-Talk or Voice Activity Detection)
  - Audio playback toggle
  - Connection status and controls
  - Image generation status indicator

## Technical Implementation

### API Endpoint

The image generation is handled by a dedicated API endpoint at `/api/images/generate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }
    
    // CONFIGURATION SECTION - To switch models, change "dall-e-3" to "gpt-image-1" below
    const result = await openai.images.generate({
      model: "dall-e-3",  // Alternative: "gpt-image-1"
      prompt: prompt,
      size: "1024x1024",  // Options: "1024x1024", "1792x1024", "1024x1792"
      quality: "standard" // Options: "standard", "hd" (for DALL-E 3)
    });
    
    return NextResponse.json({ image_url: result.data[0].url });
  } catch (error: any) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
```

## Project Structure

- `/src/app/agentConfigs/imageGenerationAgent.ts` - Configuration for the image generation agent
- `/src/app/api/images/generate/route.ts` - API endpoint for image generation (DALL-E 3 or GPT-image-1)
- `/src/app/App.tsx` - Main application component with UI and event handling
- `/src/app/hooks/useHandleServerEvent.ts` - Hook for processing server events and tool calls

## Using GPT-image-1 Instead of DALL-E 3

This application supports both DALL-E 3 and GPT-image-1 for image generation. To switch between models:

1. Open `/src/app/api/images/generate/route.ts`
2. Locate the configuration section in the `POST` function
3. Change the model parameter from `"dall-e-3"` to `"gpt-image-1"`

```typescript
// Change this:
const result = await openai.images.generate({
  model: "dall-e-3",
  prompt: prompt,
  size: "1024x1024",
  quality: "standard"
});

// To this:
const result = await openai.images.generate({
  model: "gpt-image-1",
  prompt: prompt,
  size: "1024x1024"
  // Note: quality parameter is not needed for gpt-image-1
});
```

Both models support the same size options: `"1024x1024"`, `"1792x1024"`, and `"1024x1792"`. GPT-image-1 also supports `"512x512"` size.

You may need to adjust your prompting style slightly as GPT-image-1 may interpret prompts differently than DALL-E 3.

## Contributors

- Deepak Lenka - [deepak-lenka](https://github.com/deepak-lenka)

## Acknowledgments

This project is built upon the foundation of [OpenAI Realtime Agents](https://github.com/openai/openai-realtime-agents), an open-source project by OpenAI that demonstrates advanced agentic patterns using the Realtime API. The architecture and implementation of this image generation agent were inspired by the patterns and best practices established in the original project.

Key components borrowed and adapted from OpenAI Realtime Agents include:

- The agent configuration system and architecture
- Real-time voice interaction capabilities
- The event handling system for processing server events
- The transcript and conversation management approach

Special thanks to the OpenAI team for making their code available as an open-source resource, enabling developers to build sophisticated AI applications with voice interaction capabilities.
