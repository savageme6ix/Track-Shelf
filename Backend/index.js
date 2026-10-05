import 'dotenv/config';
import express from "express";
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

app.get("/", (req,res)=>{
    res.send("Backend works")
})

app.listen(PORT, ()=>{
    console.log("Listening on port", PORT)
});