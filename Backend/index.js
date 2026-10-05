import 'dotenv/config';
import express from "express";
import cors from "cors";
const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: 'https://yourfrontend.com', // Only allow requests from this domain
    optionsSuccessStatus: 200 
};

app.use(express.json());
app.use(cors(corsOptions));

app.get("/", (req,res)=>{
    res.json({ message: 'Hello from Node.js!' });
})

app.listen(PORT, ()=>{
    console.log("Listening on port", PORT)
});