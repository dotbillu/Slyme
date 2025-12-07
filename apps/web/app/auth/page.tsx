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

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  overflowY: "auto",
  maxHeight: `calc(100dvh - ${theme.spacing(4)})`,
  scrollbarColor: "#fff transparent",
  "&::-webkit-scrollbar": {
    width: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#fff",
    borderRadius: "10px",
    border: "2px solid transparent",
    backgroundClip: "content-box",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "#f0f0f0",
  },
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
    maxHeight: `calc(100dvh - ${theme.spacing(8)})`,
  },
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: "100dvh",
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
  const router = useRouter();
  
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
    const password = (document.getElementById("password") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      email, // This sends either username OR email
      password,
      redirect: false,
    });

    if (result?.error) {
      console.error(result.error);
      // Show error on UI
      setEmailError(true);
      setEmailErrorMessage("Invalid username/email or password.");
      setPasswordError(true);
      setPasswordErrorMessage("Invalid username/email or password.");
    } else {
        router.push("/home");
    }
  };

  const validateInputs = () => {
    const email = document.getElementById("email") as HTMLInputElement;
    const password = document.getElementById("password") as HTMLInputElement;

    let isValid = true;

    // CHANGED: Removed regex validation to allow usernames
    if (!email.value || email.value.length < 1) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email or username.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (!password.value || password.value.length < 1) {
      setPasswordError(true);
      setPasswordErrorMessage("Password is required.");
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    return isValid;
  };
  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        <ColorModeSelect
          sx={{ position: "fixed", top: "1rem", right: "1rem" }}
        />
        <Card variant="outlined">
          <SitemarkIcon />
          <Divider>or</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => signIn("google", { callbackUrl: "/welcome/back" })}
              startIcon={<GoogleIcon />}
            >
              Continue with Google
            </Button>
            {/* <Button */}
            {/* fullWidth */}
            {/* variant="outlined" */}
            {/* onClick={() => alert("Sign in with Facebook")} */}
            {/* startIcon={<FacebookIcon />} */}
            {/* > */}
            {/* Sign in with Facebook */}
            {/* </Button> */}
          </Box>
        </Card>
      </SignInContainer>
    </AppTheme>
  );
}
