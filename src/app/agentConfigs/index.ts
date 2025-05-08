import { AllAgentConfigsType } from "@/app/types";
import imageGenerationAgent from "./imageGenerationAgent";

export const allAgentSets: AllAgentConfigsType = {
  imageGenerationAgent,
};

export const defaultAgentSetKey = "imageGenerationAgent";
