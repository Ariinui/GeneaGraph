# Configuration Appwrite Cloud

## 1. Créer un compte Appwrite

1. Allez sur https://cloud.appwrite.io
2. Créez un compte gratuit
3. Créez un nouveau projet appelé "geneagraph"

## 2. Récupérer les identifiants

Dans les paramètres du projet, notez :
- **Project ID** 
- **Endpoint** (généralement `https://cloud.appwrite.io/v1`)

## 3. Créer la base de données

1. Allez dans **Databases** dans le menu latéral
2. Cliquez sur **Create database**
3. Nommez-la `geneagraph`
4. Notez le **Database ID**

## 4. Créer les collections

### Collection `persons`
1. Dans la base de données, cliquez sur **Create collection**
2. Nommez-la `persons`
3. Ajoutez les attributs suivants :

| Nom | Type | Taille | Requis |
|-----|------|--------|--------|
| firstName | String | 100 | Oui |
| lastName | String | 100 | Oui |
| gender | String | 1 | Oui |
| birthDate | String | 20 | Non |
| birthPlace | String | 200 | Non |
| deathDate | String | 20 | Non |
| deathPlace | String | 200 | Non |
| occupation | String | 200 | Non |
| notes | String | 2000 | Non |
| branch | String | 50 | Non |
| generation | Integer | - | Non |

### Collection `relations`
1. Créez une autre collection nommée `relations`
2. Ajoutez les attributs suivants :

| Nom | Type | Taille | Requis |
|-----|------|--------|--------|
| from | String | 50 | Oui |
| to | String | 50 | Oui |
| type | String | 20 | Oui |
| label | String | 100 | Non |
| source | String | 500 | Non |

## 5. Configurer les permissions

Pour chaque collection :
1. Allez dans l'onglet **Permissions**
2. Ajoutez le rôle **Any** (ou créez un utilisateur spécifique)
3. Accordez les permissions : **Create**, **Read**, **Update**, **Delete**

## 6. Configurer le fichier .env

Copiez le fichier `.env.example` en `.env` et remplissez les valeurs :

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=votre-project-id
VITE_APPWRITE_DATABASE_ID=geneagraph
VITE_APPWRITE_PERSONS_COLLECTION=persons
VITE_APPWRITE_RELATIONS_COLLECTION=relations
```

## 7. Activer la synchronisation cloud

Dans l'application, cliquez sur l'icône cloud dans la sidebar pour activer la synchronisation.

## Dépannage

- **Erreur "Appwrite non configuré"** : Vérifiez que les variables d'environnement sont correctes
- **Erreur de permissions** : Vérifiez que le rôle "Any" a les permissions nécessaires
- **Données non synchronisées** : Vérifiez la console du navigateur pour les erreurs
