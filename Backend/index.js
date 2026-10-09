import 'dotenv/config';
import express from "express";
import session from "express-session";
import cors from "cors";
const app = express();
const PORT = 3000;
import playlistRoute from "./Routes/playlistRoute.js";
import loginRoute from "./Routes/loginRoute.js";
import callbackRoute from "./Routes/callbackRoute.js"
import refreshTokenRoute from './Routes/refreshTokenRoute.js';
import meRoute from './Routes/meRoute.js';
app.use(cors({
  origin: "http://127.0.0.1:5173",
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET, // Used to sign the session ID cookie
  resave: false,                          // Don't save session if unmodified
  saveUninitialized: false,               // Don't create session until something is stored
  cookie: { 
    httpOnly: true,                       // Prevents client-side JS from reading the cookie
    secure: false,                        // Set to true in production if using HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 30           // Cookie expiration time (e.g., 24 hours in ms)
  }
}));

app.use("/api/spotify", playlistRoute);
app.use("/api/spotify",loginRoute);
app.use("/api/spotify",callbackRoute);
app.use("/api/spotify",refreshTokenRoute);
app.use("/api/spotify",meRoute);

app.listen(PORT, ()=>{
    console.log("Listening on port", PORT)
});