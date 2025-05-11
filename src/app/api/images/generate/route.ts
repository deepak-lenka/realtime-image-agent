import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Image Generation API Endpoint
 * 
 * This endpoint generates images using OpenAI's image generation models.
 * 
 * MODEL OPTIONS:
 * -------------
 * 1. DALL-E 3 (Current implementation)
 *    - High quality, detailed images
 *    - Good for complex scenes and artistic styles
 *    - Available sizes: 1024x1024, 1792x1024, 1024x1792
 * 
 * 2. GPT-image-1 (Alternative option)
 *    - Newer model with potentially better understanding of prompts
 *    - May produce more consistent results with text
 *    - Available sizes: 1024x1024, 1792x1024, 1024x1792, 512x512
 * 
 * TO SWITCH TO GPT-image-1:
 * ------------------------
 * 1. Change the model parameter from "dall-e-3" to "gpt-image-1"
 * 2. Adjust size parameter if needed (both support the same sizes)
 * 3. Optional: You may need to adjust prompt handling as GPT-image-1 may
 *    interpret prompts slightly differently
 */
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    console.log("Generating image with prompt:", prompt);

    // CONFIGURATION SECTION - Modify these parameters to change the image generation behavior
    // -----------------------------------------------------------------------------
    // To use GPT-image-1 instead of DALL-E 3, change "dall-e-3" to "gpt-image-1" below
    const result = await openai.images.generate({
      model: "dall-e-3",  // Alternative: "gpt-image-1"
      prompt: prompt,
      size: "1024x1024",  // Options: "1024x1024", "1792x1024", "1024x1792"
      quality: "standard" // Options: "standard", "hd" (for DALL-E 3)
    });

    // Get the image URL from the response
    const image_url = result.data[0].url;
    
    if (!image_url) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    // Return the image URL
    return NextResponse.json({
      image_url: image_url,
      prompt: prompt
    });
  } catch (error: any) {
    console.error("Error in /images/generate:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
