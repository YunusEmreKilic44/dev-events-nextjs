import Event from "@/database/event.model";
import connectDB from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

const arrayFields = new Set(["agenda", "tags"]);

function normalizeEventPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (!arrayFields.has(key) || Array.isArray(value)) {
        return [key, value];
      }

      if (typeof value !== "string") {
        return [key, value];
      }

      const trimmedValue = value.trim();

      if (trimmedValue.startsWith("[")) {
        try {
          return [key, JSON.parse(trimmedValue)];
        } catch {
          return [key, value];
        }
      }

      return [
        key,
        trimmedValue
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ];
    }),
  );
}

async function readEventPayload(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return normalizeEventPayload(await req.json());
  }

  const formData = await req.formData();
  const payload: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

  for (const [key, value] of formData.entries()) {
    if (arrayFields.has(key)) {
      const values = formData.getAll(key);
      payload[key] = values.length === 1 ? values[0] : values;
    } else {
      payload[key] = value;
    }
  }

  return normalizeEventPayload(payload);
}

export const POST = async (req: NextRequest) => {
  try {
    await connectDB();

    let event: Record<string, unknown>;

    try {
      event = await readEventPayload(req);
    } catch {
      return NextResponse.json(
        { message: "Invalid request body format" },
        { status: 400 },
      );
    }
    const createdEvent = await Event.create(event);
    return NextResponse.json(
      {
        message: "Event created successfully",
        event: createdEvent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message: "Event Creation Failed",
        error: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
};
