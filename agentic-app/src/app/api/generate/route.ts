import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSceneRecipe } from "@/lib/scene/generator";

const requestSchema = z.object({
  prompt: z
    .string()
    .min(10, "Describe the scene with at least 10 characters.")
    .max(480, "Keep the prompt under 480 characters."),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          issues: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const recipe = generateSceneRecipe(parsed.data.prompt);

    return NextResponse.json({
      status: "ok",
      recipe,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        issues: ["Unable to craft a scene from that prompt. Try again."],
      },
      { status: 500 },
    );
  }
}
