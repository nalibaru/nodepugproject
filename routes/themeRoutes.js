import express from 'express';
import Theme from '../models/Theme.js';
const router = express.Router();

router.post('/save', async (req, res) => {
    try {
        const themeName = req.body.themeName; 
        const username = req.body.username; 
        if (!username || !themeName) {
            return res.status(400).send('Username or themeName missing.');
        }

        console.log("Theme is going to update");
        const day = new Date();

        const result = await Theme.findOne({ username: username });
        if (result) {
            await Theme.findOneAndUpdate(
                { username: username },
                { themeName: themeName, updatedOn: day },
                { new: true }
            );
            res.status(200).send(`${themeName} updated successfully.`);
        } else {
            const newTheme = new Theme({
                username: username,
                themeName: themeName,
                updatedOn: day
            });
            await newTheme.save();
            res.status(200).send(`${themeName} saved successfully.`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to update theme.');
    }
});


export default router;