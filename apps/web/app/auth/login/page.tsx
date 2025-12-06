"use client";
import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import ForgotPassword from "@/data/material/getting-started/templates/sign-in/components/ForgotPassword";
import ColorModeSelect from "@/data/material/getting-started/templates/shared-theme/ColorModeSelect";

import AppTheme from "@/data/material/getting-started/templates/shared-theme/AppTheme";
import {
  GoogleIcon,
  FacebookIcon,
  SitemarkIcon,
} from "@/data/material/getting-started/templates/sign-in/components/CustomIcons";

import { signIn, useSession } from "next-auth/react";
import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { keysAtom, userAtom } from "@store";
import { API_BASE_URL } from "@/lib/constants";
import { E2EEKeys, User } from "@/lib/types";
import KeyGen from "@/lib/crypt";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
  minHeight: "100%",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage:
      "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage:
        "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

export default function SignIn(props: { disableCustomTheme?: boolean }) {
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState("");
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateInputs()) return;

    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement)
      .value;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      console.error(result.error);
    }
  };

  const validateInputs = () => {
    const email = document.getElementById("email") as HTMLInputElement;
    const password = document.getElementById("password") as HTMLInputElement;

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters long.");
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    return isValid;
  };

  const { data: session, status } = useSession();
  const router = useRouter();
  const [, setUser] = useAtom(userAtom);
  const [keys, setKeys] = useAtom(keysAtom);
  const isSyncing = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || isSyncing.current)
      return;
    const currentUser = session.user;
    isSyncing.current = true;
    const newKeys = KeyGen();
    const syncUser = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/signin/oauth/${currentUser.email}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!res.ok) {
          console.warn("Backend returned error or user not found");
          isSyncing.current = false;
          return;
        }

        const userData: User = await res.json();
        setUser(userData);
        setKeys(newKeys);

        router.replace("/home");

        console.log(userData);
        console.log(newKeys);
      } catch (err) {
        console.error("error logging in :", err);
        isSyncing.current = false;
      }
    };

    syncUser();
  }, [session, status, router, setUser, setKeys, keys]);

  if (status === "authenticated") {
    return (
      <AppTheme {...props}>
        <CssBaseline enableColorScheme />
        <SignInContainer
          direction="column"
          justifyContent="center"
          alignItems="center"
        >
          <ColorModeSelect
            sx={{ position: "fixed", top: "1rem", right: "1rem" }}
          />
        </SignInContainer>
      </AppTheme>
    );
  }
  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        <ColorModeSelect
          sx={{ position: "fixed", top: "1rem", right: "1rem" }}
        />
        <Card variant="outlined">
          <SitemarkIcon />
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 2,
            }}
          >
            <FormControl>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                placeholder="username or email"
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={emailError ? "error" : "primary"}
              />
            </FormControl>
            <FormControl>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                placeholder="password"
                type="password"
                id="password"
                autoComplete="current-password"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={passwordError ? "error" : "primary"}
              />
            </FormControl>

            <Link
              component="button"
              type="button"
              onClick={handleClickOpen}
              variant="body2"
              sx={{
                fontSize: "0.4rem",
                alignSelf: "flex-start",
                ml: "10px",
                mb: "20px",
                padding: 0,
              }}
            >
              Forgot password?
            </Link>

            <ForgotPassword open={open} handleClose={handleClose} />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              onClick={validateInputs}
            >
              Login
            </Button>
          </Box>
          <Divider>or</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => signIn("google")}
              startIcon={<GoogleIcon />}
            >
              Sign in with Google
            </Button>
            {/* <Button */}
            {/*   fullWidth */}
            {/*   variant="outlined" */}
            {/*   onClick={() => alert("Sign in with Facebook")} */}
            {/*   startIcon={<FacebookIcon />} */}
            {/* > */}
            {/*   Sign in with Facebook */}
            {/* </Button> */}
            <Typography sx={{ textAlign: "center" }}>
              New ?{"  "}
              <Link
                variant="body2"
                sx={{ alignSelf: "center", cursor: "pointer" }}
                onClick={() => router.push("/auth/signup")}
              >
                Sign up - and socialize
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignInContainer>
    </AppTheme>
  );
}
