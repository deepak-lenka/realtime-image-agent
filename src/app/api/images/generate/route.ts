import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

    console.log("Generating image with prompt:", prompt);

    // Generate the image using DALL-E 3
    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024", // Standard size for DALL-E 3
      quality: "standard"
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
