"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Loader2,
  Users,
  User,
  MessageSquare,
  Send,
  Info,
  Bell,
  UserCheck,
  UsersRound,
} from "lucide-react";
const origin = process.env.NEXT_PUBLIC_API_URL;

export async function sendNotification(params: any): Promise<any> {
  try {
    // console.log(origin)
    const response = await fetch(`${origin}/notifications/send-note/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Failed to send notification: ${response.status} ${
          response.statusText
        }${errorData ? ` - ${JSON.stringify(errorData)}` : ""}`
      );
    }

    // التحقق من حالة الاستجابة فقط
    const data = await response.json();

    // طباعة الاستجابة في الـ console
    // console.log("Notification sent:", data);

    // إذا كانت الحالة 200، نعرض رسالة النجاح
    if (response.status === 200) {
      alert("Notification sent successfully!");
    }

    // إعادة التحقق من الصفحة (إذا كان لديك حاجة لذلك)
    // revalidatePath("/dashboard_student/notifications");

    return data;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
// import { sendNotification } from "../../lib/actions/notification-actions";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import Cookies from "js-cookie";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { PredefinedMessages } from "./PredefinedMessages";
import { toast, ToastContainer } from "react-toastify";

export async function getUserIdFromToken(): Promise<number | null> {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];
  // console.log("Token from cookie:", token);

  if (!token) return null;

  try {
    const decoded: any = jwtDecode(token);
    return decoded.user_id || decoded.id;
  } catch (e) {
    console.error("Invalid token:", e);
    return null;
  }
}

interface Track {
  id: number;
  name: string;
}
// Define recipient types
type RecipientType = "student" | "track";

const formSchema = z
  .object({
    recipientType: z.enum(["student", "track"], {
      required_error: "Please select a recipient type",
    }),
    student_id: z.string().optional(),
    track_id: z.string().optional(),
    message: z
      .string()
      .min(5, {
        message: "Message must be at least 5 characters",
      })
      .max(500, {
        message: "Message cannot exceed 500 characters",
      }),
  })
  .refine(
    (data) => {
      if (data.recipientType === "student") {
        return !!data.student_id;
      } else {
        return !!data.track_id;
      }
    },
    {
      message: "Please select a recipient",
      path: ["student_id"],
    }
  );

export function SendNotificationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipientType, setRecipientType] = useState<RecipientType>("student");
  const [students, setStudents] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipientType: "student",
      message: "",
    },
  });

  // Watch for changes to recipientType
  const watchRecipientType = form.watch("recipientType");

  // Fetch students and tracks from the API
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = Cookies.get("token");
        if (!token) {
          console.error("No token found");
          return;
        }
        const response = await fetch(
          `${origin}/users/instructors/instructor_students/`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch students");
        }
        const data = await response.json();
        // console.log("Students data:", data);
        setStudents(data || []);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };

    const fetchInstructorTracks = async () => {
      try {
        const userId = await getUserIdFromToken();
        // console.log("User ID from token:", userId);
        if (!userId) throw new Error("User ID not found in token.");
        const res = await fetch(`${origin}/users/instructors/${userId}`);
        const instructorData = await res.json();
        const instructorId = instructorData.id;
        // console.log("Instructor ID:", instructorId);
        const trackRes = await fetch(
          `${origin}/users/instructor/${instructorId}/tracks/`
        );
        const trackData = await trackRes.json();
        // console.log("Tracks for instructor:", trackData);
        setTracks(trackData);
      } catch (error) {
        console.error("Failed to fetch instructor tracks:", error);
      }
    };

    fetchStudents();
    fetchInstructorTracks();
  }, []);

  const handleRecipientTypeChange = (value: RecipientType) => {
    setRecipientType(value);
    form.setValue("recipientType", value);
    if (value === "student") {
      form.setValue("track_id", undefined);
    } else {
      form.setValue("student_id", undefined);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    async function fetchInstructorId(): Promise<number> {
      const userId = await getUserIdFromToken();
      // console.log("User ID from token:", userId);
      if (!userId) throw new Error("User ID not found in token.");
      const res = await fetch(`${origin}/users/instructors/${userId}`);
      const data = await res.json();
      // console.log("Data from student API:", data);
      return data.id;
    }
    try {
      const instructor_id = await fetchInstructorId();
      // console.log("Instructor ID:", instructor_id);
      const payload = {
        instructor_id,
        message: values.message,
        ...(values.recipientType === "student"
          ? { student_id: Number.parseInt(values.student_id!) }
          : { track_id: Number.parseInt(values.track_id!) }),
      };
      // console.log("Payload:", payload);
      const result = await sendNotification(payload);
      // console.log("Response from notification API:", result);
      if (
        result.message &&
        (result.message.includes("Notes sent to all students") ||
          result.message.includes("Note sent successfully"))
      ) {
        toast.success("Notification sent successfully!", {
          autoClose: 3000,
          closeOnClick: true,
        });
      } else {
        throw new Error("Failed to send notification.");
      }
      form.reset({
        recipientType: values.recipientType,
        message: "",
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
      toast.error(
        "❌ There was an error sending your notification. Please try again.",
        {
          autoClose: 3000,
          closeOnClick: true,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSelectPredefinedMessage = (selectedMessage: string) => {
    form.setValue("message", selectedMessage);
    toast.info("Predefined message selected", {
      autoClose: 3000,
      closeOnClick: true,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5 text-[#007acc]" />
          <h3 className="text-lg font-medium text-gray-700">
            Notification Details
          </h3>
        </div>

        <FormField
          control={form.control}
          name="recipientType"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-[#007acc] text-base font-medium">
                  Recipient Type
                </FormLabel>
                <div className="flex items-center text-xs text-gray-500">
                  <Info className="h-3 w-3 mr-1" />
                  <span>Who will receive this notification?</span>
                </div>
              </div>
              <FormControl>
                <RadioGroup
                  onValueChange={(value: RecipientType) =>
                    handleRecipientTypeChange(value)
                  }
                  defaultValue={field.value}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div
                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      watchRecipientType === "student"
                        ? "border-[#007acc] bg-[#f0f7ff]"
                        : "border-gray-200 bg-white hover:border-[#c7e5ff]"
                    }`}
                  >
                    <div className="absolute top-2 right-2">
                      <RadioGroupItem
                        value="student"
                        id="student"
                        className="sr-only"
                      />
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          watchRecipientType === "student"
                            ? "border-[#007acc] bg-[#007acc]"
                            : "border-gray-300"
                        }`}
                      >
                        {watchRecipientType === "student" && (
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    <Label
                      htmlFor="student"
                      className="flex flex-col items-center p-6 cursor-pointer"
                    >
                      <UserCheck
                        className={`h-10 w-10 mb-3 ${
                          watchRecipientType === "student"
                            ? "text-[#007acc]"
                            : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`font-medium ${
                          watchRecipientType === "student"
                            ? "text-[#007acc]"
                            : "text-gray-700"
                        }`}
                      >
                        Individual Student
                      </span>
                      <span className="text-xs text-gray-500 mt-1 text-center">
                        Send to a specific student
                      </span>
                    </Label>
                  </div>
                  <div
                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      watchRecipientType === "track"
                        ? "border-[#007acc] bg-[#f0f7ff]"
                        : "border-gray-200 bg-white hover:border-[#c7e5ff]"
                    }`}
                  >
                    <div className="absolute top-2 right-2">
                      <RadioGroupItem
                        value="track"
                        id="track"
                        className="sr-only"
                      />
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          watchRecipientType === "track"
                            ? "border-[#007acc] bg-[#007acc]"
                            : "border-gray-300"
                        }`}
                      >
                        {watchRecipientType === "track" && (
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    <Label
                      htmlFor="track"
                      className="flex flex-col items-center p-6 cursor-pointer"
                    >
                      <UsersRound
                        className={`h-10 w-10 mb-3 ${
                          watchRecipientType === "track"
                            ? "text-[#007acc]"
                            : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`font-medium ${
                          watchRecipientType === "track"
                            ? "text-[#007acc]"
                            : "text-gray-700"
                        }`}
                      >
                        Entire Track
                      </span>
                      <span className="text-xs text-gray-500 mt-1 text-center">
                        Send to all students in a track
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        {watchRecipientType === "student" ? (
          <FormField
            control={form.control}
            name="student_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#007acc] text-base font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Select Student
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value: string) => {
                    // console.log("Selected student ID:", value);
                    field.onChange(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full bg-white border-gray-300 focus:ring-[#007acc] focus:border-[#007acc] h-12 mt-2 text-black">
                      <SelectValue placeholder="Choose a student to notify" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border-gray-200">
                    {students.length > 0 ? (
                      students.map((student) => (
                        <SelectItem key={student.id} value={String(student.id)}>
                          {student.user.username}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-students" disabled>
                        No students available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription className="text-gray-500 text-sm mt-2">
                  The notification will be sent only to this student.
                </FormDescription>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="track_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#007acc] text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Track
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value: string) => {
                    // console.log("Selected Track ID:", value);
                    field.onChange(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full bg-white border-gray-300 focus:ring-[#007acc] focus:border-[#007acc] h-12 mt-2 text-black">
                      <SelectValue placeholder="Choose a track" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border-gray-200">
                    {tracks.length > 0 ? (
                      tracks.map((track) => (
                        <SelectItem key={track.id} value={String(track.id)}>
                          {track.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-tracks" disabled>
                        No tracks available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription className="text-gray-500 text-sm mt-2">
                  The notification will be sent to all students in this track.
                </FormDescription>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
        )}

        {/* Predefined Messages Section */}
        <PredefinedMessages onSelectMessage={handleSelectPredefinedMessage} />

        {/* Message Input */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#007acc] text-base font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message Content
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Type your notification message here or select a predefined message above..."
                  className="min-h-40 resize-none bg-white border-gray-300 focus:ring-[#007acc] focus:border-[#007acc] mt-2 text-base text-black"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-gray-500 text-sm mt-2 flex items-start gap-2">
                <Info className="h-4 w-4 text-[#007acc] mt-0.5 flex-shrink-0" />
                <span>
                  Write a clear and concise message or choose a predefined one.
                  Students will receive this notification in their dashboard and
                  via email.
                </span>
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#007acc] hover:bg-[#0062a3] text-white py-2.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending notification...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Notification
            </>
          )}
        </Button>
      </form>
      <ToastContainer position="bottom-right" />
    </Form>
  );
}
