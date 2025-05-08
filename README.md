# Real-time AI Image Generation Voice Agent

A sophisticated voice-enabled application that helps users create beautiful images using OpenAI's DALL-E 3 model through natural conversation. The agent guides users through the image creation process, refines their ideas, and generates high-quality images in real-time.



## Features

- **Voice-Driven Interface**: Interact with the AI assistant using your voice for a natural conversation experience
- **Iterative Image Refinement**: The agent asks thoughtful questions to help refine your image concept
- **Real-Time Image Generation**: Generate images using OpenAI's DALL-E 3 model with a simple voice command
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

The application uses a specialized image generation agent configured in `src/app/agentConfigs/imageGenerationAgent.ts`. This agent is designed to guide users through the image creation process and generate high-quality images using DALL-E 3.

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
4. **API Processing**: The prompt is sent to the `/api/images/generate` endpoint, which calls the OpenAI DALL-E 3 API
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
    
    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024"
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
- `/src/app/api/images/generate/route.ts` - API endpoint for DALL-E 3 image generation
- `/src/app/App.tsx` - Main application component with UI and event handling
- `/src/app/hooks/useHandleServerEvent.ts` - Hook for processing server events and tool calls

## Contributors

- Deepak Lenka - [deepak-lenka](https://github.com/deepak-lenka)
