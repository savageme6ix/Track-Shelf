import 'dotenv/config';
import express from "express";
import cors from "cors";
const app = express();
const PORT = 3000;
import playlistRoute from "./Routes/playlistRoute.js";
import loginRoute from "./Routes/loginRoute.js";
import callbackRoute from "./Routes/callbackRoute.js"
// const corsOptions = {
//     origin: 'http://localhost:5173', // Only allow requests from this domain
//     optionsSuccessStatus: 200 
// };

app.use(express.json());
app.use(cors());

app.get("/api/test", (req,res)=>{
    res.json({ message: 'Hello from Node.js!' });
});

app.use("/api/spotify", playlistRoute);
app.use("/api/spotify",loginRoute);
app.use("/api/spotify",callbackRoute);

app.listen(PORT, ()=>{
    console.log("Listening on port", PORT)
});