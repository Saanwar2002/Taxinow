
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth, UserRole } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { User, Briefcase, CarIcon, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["passenger", "driver", "operator"], { required_error: "You must select a role." }),
});

export function LoginForm() {
  const { login: contextLogin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "passenger",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if (!auth || !db) {
      toast({
        title: "Login Error",
        description: "Firebase services not available. Please try again later.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      // Fetch user profile from Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        toast({
          title: "Login Failed",
          description: "User profile not found. Please contact support.",
          variant: "destructive",
        });
        setIsLoading(false);
        // Optionally sign out the Firebase user if profile is mandatory
        // await auth.signOut(); 
        return;
      }

      const userProfile = userDocSnap.data();

      if (userProfile.role !== values.role) {
        toast({
          title: "Role Mismatch",
          description: `You're trying to log in as ${values.role}, but your account is registered as ${userProfile.role}. Please select the correct role.`,
          variant: "destructive",
        });
        setIsLoading(false);
        // Optionally sign out
        // await auth.signOut();
        return;
      }
      
      let deadlineISO: string | null = null;
      if (userProfile.phoneVerificationDeadline) {
          if (userProfile.phoneVerificationDeadline instanceof Timestamp) {
              deadlineISO = userProfile.phoneVerificationDeadline.toDate().toISOString();
          } else if (typeof userProfile.phoneVerificationDeadline === 'string') {
              // Assume it's already an ISO string or attempt to parse
              try {
                  deadlineISO = new Date(userProfile.phoneVerificationDeadline).toISOString();
              } catch (e) { console.warn("Could not parse phoneVerificationDeadline from string", userProfile.phoneVerificationDeadline); }
          } else if (typeof userProfile.phoneVerificationDeadline === 'object' && ('seconds' in userProfile.phoneVerificationDeadline || '_seconds' in userProfile.phoneVerificationDeadline)) {
              const seconds = (userProfile.phoneVerificationDeadline as any).seconds ?? (userProfile.phoneVerificationDeadline as any)._seconds;
              const nanoseconds = (userProfile.phoneVerificationDeadline as any).nanoseconds ?? (userProfile.phoneVerificationDeadline as any)._nanoseconds ?? 0;
              if (typeof seconds === 'number') {
                  deadlineISO = new Date(seconds * 1000 + nanoseconds / 1000000).toISOString();
              }
          }
      }


      contextLogin(
        firebaseUser.uid,
        firebaseUser.email || values.email,
        userProfile.name || firebaseUser.displayName || values.email.split('@')[0],
        userProfile.role as UserRole,
        userProfile.vehicleCategory,
        userProfile.phoneNumber || firebaseUser.phoneNumber,
        userProfile.phoneVerified,
        userProfile.status,
        deadlineISO
      );

      toast({
        title: "Login Successful",
        description: `Welcome back, ${userProfile.name || firebaseUser.displayName}!`,
      });

    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Invalid email or password.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Invalid email or password. Please try again.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many login attempts. Please try again later.";
            break;
          case 'auth/user-disabled':
            errorMessage = "This account has been disabled.";
            break;
          default:
            errorMessage = `Login failed: ${error.message}`;
        }
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGuestLogin = (role: UserRole) => {
    let email = "";
    let name = "";
    const guestId = `guest-${Date.now()}`;
    switch (role) {
      case "passenger":
        email = "guest-passenger@taxinow.com";
        name = "Guest Passenger";
        break;
      case "driver":
        email = "guest-driver@taxinow.com";
        name = "Guest Driver";
        break;
      case "operator":
        email = "guest-operator@taxinow.com";
        name = "Guest Operator";
        break;
    }
    contextLogin(guestId, email, name, role, undefined, undefined, 'Active', undefined);
    toast({
      title: "Guest Login Successful",
      description: `Logged in as ${name}.`,
    });
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="your@email.com" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel>Password</FormLabel>
                  <Link href="/forgot-password"
                        className="text-xs text-muted-foreground hover:text-primary underline">
                    Forgot Password?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Login as:</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4"
                    disabled={isLoading}
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="passenger" />
                      </FormControl>
                      <FormLabel className="font-normal">Passenger</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="driver" />
                      </FormControl>
                      <FormLabel className="font-normal">Driver</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="operator" />
                      </FormControl>
                      <FormLabel className="font-normal">Taxi Base Operator</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Login
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline text-accent hover:text-accent/90">
              Sign up
            </Link>
          </p>
        </form>
      </Form>

      <Separator className="my-6" />

      <div className="space-y-4">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Or try as a guest:
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleGuestLogin("passenger")}
        >
          <User className="mr-2 h-4 w-4" /> Login as Guest Passenger
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleGuestLogin("driver")}
        >
          <CarIcon className="mr-2 h-4 w-4" /> Login as Guest Driver
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleGuestLogin("operator")}
        >
          <Briefcase className="mr-2 h-4 w-4" /> Login as Guest Operator
        </Button>
      </div>
    </>
  );
}

