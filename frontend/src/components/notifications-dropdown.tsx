"use client"

import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, RefreshCcw, UserCircle, Users, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import axios from "axios"
import Cookies from "js-cookie"
import { extractExamDateFromMessage } from "../lib/utils/data-parser"
import { useExamCalendar } from "@/hooks/use-exam-calendar"

interface Notification {
  id: string
  message: string
  created_at: string
  instructor: number | string
  read: boolean
  is_track_notification?: boolean
}
const origin = process.env.NEXT_PUBLIC_API_URL;


export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { addExamEvent, processNotification } = useExamCalendar()

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const token = Cookies.get("token")
      if (!token) {
        console.error("Token not found in cookies")
        return
      }

      const response = await axios.get(`${origin}/notifications/notes/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.data && Array.isArray(response.data)) {
        const formattedNotifications = response.data.map((notification: any) => ({
          id: `${notification.id}`,
          message: notification.message,
          created_at: notification.created_at,
          instructor: notification.instructor_name,
          read: notification.read,
          is_track_notification: notification.is_track_notification || notification.track !== null,
        }))

        setNotifications(formattedNotifications)

        // Process notifications for exams
        formattedNotifications.forEach((notification) => {
          if (notification.message.includes("Exam 33")) {
            processNotification(notification)
          }
        })

        // Add hardcoded test notification for "Exam 33"
        const testNotification = {
          message: 'A new exam "Exam 33" has been scheduled for you at 4/20/2025, 3:07:00 AM.',
          instructor: undefined, // Adjusted to match the expected type
        }
        processNotification(testNotification)

        const unread = formattedNotifications.filter((n) => !n.read).length
        setUnreadCount(unread)
      } else {
        throw new Error("Invalid response data")
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load notifications. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (open && !isLoading) {
      fetchNotifications()
    }
  }, [open, isLoading])


  // تحديث تلقائي عند استلام Push Notification
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "push-received") {
          fetchNotifications(); // تحديث الإشعارات عند وصول Push Notification
        }
      });
    }
  }, [fetchNotifications]);

  // Periodic fetch when dropdown is closed
  useEffect(() => {
    if (!open) {
      const intervalId = setInterval(() => {
        fetchNotifications()
      }, 30000)
      return () => clearInterval(intervalId)
    }
  }, [open])

  // Initial fetch on component mount
  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const token = Cookies.get("token")
      if (!token) {
        console.error("Token not found in cookies")
        return
      }

      await axios.patch(
        `${origin}/notifications/notes/${id}/`,
        { read: true },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setNotifications((prev) => prev.filter((notification) => notification.id !== id))
      setUnreadCount((prevCount) => prevCount - 1)

      toast({
        title: "Notification",
        description: "Notification marked as read and deleted.",
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = Cookies.get("token")
      if (!token) {
        console.error("Token not found in cookies")
        return
      }

      await axios.patch(
        `${origin}/notifications/mark-all-read/`,
        { read: true },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setNotifications([])
      setUnreadCount(0)
      toast({
        title: "Notifications",
        description: "All notifications marked as read.",
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      })
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Check if notification contains exam information
    if (notification.message.toLowerCase().includes("exam")) {
      const examInfo = extractExamDateFromMessage(notification.message)

      if (examInfo) {
        const { date, examName } = examInfo
        addExamEvent(date, examName, `Instructor: ${notification.instructor}`, notification.id)
        toast({
          title: "Exam Added to Calendar",
          description: `${examName} has been added to your calendar.`,
          variant: "default",
        })
      }
    }

    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  const addToCalendar = (notification: Notification) => {
    const examInfo = extractExamDateFromMessage(notification.message)

    if (examInfo) {
      const { date, examName } = examInfo
      addExamEvent(date, examName, `Instructor: ${notification.instructor}`, notification.id)
      toast({
        title: "Exam Added to Calendar",
        description: `${examName} has been added to your calendar.`,
        variant: "default",
      })
    } else {
      toast({
        title: "No Exam Date Found",
        description: "Could not find an exam date in this notification.",
        variant: "destructive",
      })
    }
  }

  const getNotificationIcon = (notification: Notification) => {
    if (notification.is_track_notification) {
      return <div className="h-2 w-2 rounded-full bg-yellow-500" />
    } else {
      return <div className="h-2 w-2 rounded-full bg-blue-500" />
    }
  }

  const hasExamInfo = (message: string) => {
    return message.toLowerCase().includes("exam") && extractExamDateFromMessage(message) !== null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-medium">Notifications</h3>
          <div className="flex gap-2">
            {isLoading && <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground" />}
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} className="h-auto p-0 text-xs">
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {isLoading ? "Loading notifications..." : "No notifications"}
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex cursor-pointer flex-col items-start gap-1 p-4 ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getNotificationIcon(notification)}
                    <span className="font-medium">{notification.instructor}</span>
                    {notification.is_track_notification ? (
                      <Badge className="ml-1 text-xs">
                        <Users className="mr-1 h-3 w-3" />
                        Track
                      </Badge>
                    ) : (
                      <Badge className="ml-1 text-xs">
                        <UserCircle className="mr-1 h-3 w-3" />
                        Personal
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {hasExamInfo(notification.message) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          addToCalendar(notification)
                        }}
                      >
                        <Calendar className="h-4 w-4 text-[#007acc]" />
                        <span className="sr-only">Add to calendar</span>
                      </Button>
                    )}
                    {notification.read ? <Check className="h-3 w-3 text-muted-foreground" /> : null}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}