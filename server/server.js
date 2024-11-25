import express from "express"
import mysql from "mysql"
import cors from "cors"
import multer from 'multer'
import ExcelJS from 'exceljs'

const upload = multer({ dest: 'uploads/' });
const app = express();
app.use(cors());
app.use(express.json())

//Connexion avec la bd
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "cashless"
})

//Affichage
app.get('/Mvola', (req, res) => {
    // console.log("first")
    const sql = "SELECT * FROM base_mvola";
    db.query(sql, (err, result) => {
        res.json(result)
    })
})
app.get('/Eqima', (req, res) => {
    // console.log("first")
    const sql = "SELECT * FROM base_eqima";
    db.query(sql, (err, result) => {
        res.json(result)
    })
})
app.get('/Jirama', (req, res) => {
    // console.log("first")
    const sql = "SELECT * FROM base_jirama";
    db.query(sql, (err, result) => {
        res.json(result)
    })
})
app.get('/Anomalie', (req, res) => {
    // console.log("first")
    const sql = "SELECT * FROM base_anomalie";
    db.query(sql, (err, result) => {
        res.json(result)
    })
})

//importation
// Middleware pour gérer les fichiers uploadés
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Route pour importer un fichier .excel
app.post('/import', upload.single('file'), (req, res) => {
    // Vérifier si aucun fichier n'a été uploadé
    if (!req.file) {
        return res.status(400).send('Aucun fichier n\'a été uploadé.');
    }

    // Lecture du fichier .excel avec exceljs
    const workbook = new ExcelJS.Workbook();
    workbook.xlsx.readFile(req.file.path)
        .then(() => {
            console.log('Fichier .excel lu avec succès');
            console.log('Nombre de feuilles de calcul dans le workbook:', workbook.worksheets.length);

            // Récupération des données de chaque feuille
            const rows = [];
            for (let i = 1; i <= workbook.worksheets.length; i++) {
                const worksheet = workbook.getWorksheet(i);  // Récupère la feuille de calcul actuelle
                const tempRows = []; // Tableau temporaire pour stocker les données de la feuille
                worksheet.eachRow((row, rowNumber) => {// Parcourt chaque ligne de la feuille de calcul
                    if (rowNumber !== 1) { // Ignorer la première ligne (en-têtes)
                        const rowData = row.values.slice(1); // Ignorer la première colonne (indices de ligne)
                        if (rowData.length > 0) { // Vérifie si la ligne contient des données
                            tempRows.push(rowData); // Ajoute les données de la ligne au tableau temporaire
                        }
                    }
                });
                rows.push(tempRows); // Ajoute le tableau temporaire contenant les données de la feuille à rows
            }

            // Définir les requêtes SQL pour chaque table
            const sqlQueries = [
                "INSERT INTO base_Mvola (id, transaction_id, date_transaction, type, initiateur, debiteur, crediteur, statut, montant) VALUES ?",
                "INSERT INTO base_eqima (id, nom_client, ref_client, num_payeur, num_cash, num_jirama, ref_fact, montant, mois, annee, statut) VALUES ?",
                "INSERT INTO base_anomalie (id, mvola_transaction, mvola_date, mvola_statut, mvola_montant, jirama_transaction, jirama_recu, jirama_fact, jirama_date, jirama_utilisateur) VALUES ?",
                "INSERT INTO base_jirama (id, num_transaction, num_prestataire, num_recu, utilisateur, date, num_fact) VALUES ?"
            ];

            // Exécuter les requêtes SQL
            const executeQueries = (index) => {
                // Vérifie si toutes les requêtes ont été exécutées
                if (index < sqlQueries.length) {
                    // Exécute la requête SQL correspondante à l'index actuel
                    db.query(sqlQueries[index], [rows[index]], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de l\'insertion des données :', err);
                            return res.status(500).send('Une erreur est survenue lors de l\'importation des données.');
                        }
                        console.log('Données importées dans la table avec succès');
                        executeQueries(index + 1); // Appel récursif pour exécuter la prochaine requête
                    });
                } else {
                    console.log('Toutes les données ont été importées avec succès');
                    res.status(200).send('Données importées avec succès');
                }
            };

            // Commencer l'exécution des requêtes SQL
            executeQueries(0);
        })
        .catch(err => {
            console.error('Erreur lors de la lecture du fichier :', err);
            res.status(500).send('Une erreur est survenue lors de la lecture du fichier.');
        });
});


//Compte Mvola
app.get('/MvolaCount', (req, res) => {
    db.query('SELECT COUNT(*) AS total_mvola FROM base_mvola', (error, result) => {
        if (error) {
            console.error('Erreur lors du comptage des demandes :', error);
            return res.status(500).json({ error: 'Erreur lors du comptage des demandes' });
        }
        const count = result[0].total_mvola;
        res.json({ count });
    });
});

//Compte Eqima
app.get('/EqimaCount', (req, res) => {
    db.query('SELECT COUNT(*) AS total_eqima FROM base_eqima', (error, result) => {
        if (error) {
            console.error('Erreur lors du comptage eqima :', error);
            return res.status(500).json({ error: 'Erreur lors du comptage eqima' });
        }
        const count = result[0].total_eqima;
        res.json({ count });
    });
});

//Compte Anomalie
app.get('/AnomalieCount', (req, res) => {
    db.query('SELECT COUNT(*) AS total_anomalie FROM base_anomalie', (error, result) => {
        if (error) {
            console.error('Erreur lors du comptage anomalie :', error);
            return res.status(500).json({ error: 'Erreur lors du comptage anomalie' });
        }
        const count = result[0].total_anomalie;
        res.json({ count });
    });
});

//Compte Jirama
app.get('/JiramaCount', (req, res) => {
    db.query('SELECT COUNT(*) AS total_jirama FROM base_jirama', (error, result) => {
        if (error) {
            console.error('Erreur lors du comptage jirama :', error);
            return res.status(500).json({ error: 'Erreur lors du comptage jirama' });
        }
        const count = result[0].total_jirama;
        res.json({ count });
    });
});


//Compte Statut Mvola
app.get('/MvolaStatutEffect', (req, res) => {
    db.query("SELECT COUNT(*) AS count FROM base_anomalie WHERE mvola_statut = 'effectué'", (error, result) => {
        if (error) {
            console.error('Erreur lors du comptage des statut :', error);
            return res.status(500).json({ error: 'Erreur lors du comptage statut' });
        }
        const count = result[0].count; // Récupérer la valeur de count depuis le résultat de la requête
        res.json({ count });
    });
});

app.get('/MvolaStatutNonEffect', (req, res) => {
    db.query("SELECT COUNT(*) AS count FROM base_anomalie WHERE mvola_statut = 'Non effectué'", (error, result) => {
        if (error) {
            console.error('Erreur lors du comptage des statut :', error);
            return res.status(500).json({ error: 'Erreur lors du comptage statut' });
        }
        const count = result[0].count; // Récupérer la valeur de count depuis le résultat de la requête
        res.json({ count });
    });
});






app.listen(8088, () => {
    console.log("Listening");
})