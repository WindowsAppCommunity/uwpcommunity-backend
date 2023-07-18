# UWPC IPLD Database Migration

Sequelize is very buggy and awkward, and Postgres via Heroku costs more than it should. It's currently blocking us from migrating to the latest version of Discord.JS and NodeJS.

For this reason, we will be migrating our data to [IPLD](https://ipld.io/docs/). 

## Long term plan:

Gradually over time, we will transition from client-server to fully distributed. Users will (eventually) be able to independently publish their own data from their own devices without a central authority.

- Keep the old backend/frontend, but migrate database to ipld (we are here)
- Build the new distributed app how we want it
- Modify the backend code to work alongside the distributed app.

This will enable free, efficient and offline-first collaboration services for our community.


## What's IPLD?
"IPLD stands for "InterPlanetary Linked Data, and is a series of standards and formats for describing data in a [content-addressing](https://ipfs.io/ipfs/QmcADHtiRfhJ25iPsSUDV1gkTfF8QX6WcJ7BrzDUuu5t2h/docs/motivation/benefits-of-content-addressing/)-emphatic way"

Crucially, we'll be using this [in combination](https://ipfs.io/ipfs/QmcADHtiRfhJ25iPsSUDV1gkTfF8QX6WcJ7BrzDUuu5t2h/docs/intro/ecosystem/) with tech like ipfs and ipns to go from "data" to "distributed, interactive application".

## Where's the data actually stored?
When you publish something to ipfs (whether via ipns or not), we don't "push" it to a location, we instead advertise to the others that we have the content.

IPLD and all data on ipfs is content-addressed, and can be independently verified by each person that downloads / rehosts the data by recalculating the data's unique Content Identifier (cid). This is done automatically by the tooling.

IPNS acts as a pointer to the data. This pointer can be updated and published to others, and always points to a unique CID (usually a file or some raw ipld data) that others can retrieve, similar to how git tags work.

So where's the data _actually_ stored? Anywhere we want!

As long as one machine on the network is holding our data when the server starts up, it'll be accessible. From there, we can simply keep it in memory.

Anyone can help rehost the data, but since modifications are happening exclusively on our server (which doesn't give us permanent storage without paying), we'll need some basic tooling to watch the ipns addresses and cache the data.

### Data replication

Optionally (future, low priority), highly trusted staff members can rehost the data and mirror the ipns keys used to publish it on their local machine. Ipns keys need to be re-broadcast roughly every 24h by default, so this ensures data can be retrieved and updated independently of our server. With that option, we could use js-ipfs on the client side to retrieve data directly from other peers when our server goes down.

## Data migration
1. Reorganize / convert data models (see new models below)
2. Evaluate each row as IPLD, get CID
3. Separately publish each project / user / publisher to IPNS, linking to each other as needed.


### Model conversion

1. Port the database models directly into our standard API models
    - Create new standard models, copied from current, and include new or missing fields
    - Drop unneeded fields
        - CSharp/CPP tags. Can be detected instead of declared.
        - Launch tags. Launch event data should be published separately
2. Encrypt private data with a random key, which we'll hold until the distributed app is ready.
3. Import converted models to IPLD
    - Save private projects for last, to test publishing. Needs links working.
    - Least dependent models first.

### New models
Each published separately to IPNS as IPLD data:

1. Registered user data
    - Name
    - MarkdownAboutMe
    - Contact email
    - Connections[]
        - Discord account
        - GitHub account
    - Links[]
        - Website
        - Social media
    - Participating projects[]
      - Project link (ipns)
      - Role data
2. Project data
    - Publisher (ipns of publisher)
    - Name
    - Description
    - Icon (cid)
    - HeroImage (cid)
    - Images[] (cid)
    - Accent Color
    - Category
    - CreatedAt
    - Dependencies (ipns of project)
    - Collaborators[]
      - User link
      - Role data
    - Links[]
        - GitHub link
        - External / Website
        - Download
        - Bug reports
        - Feature requests
3. Publisher data
    - Owner (ipns of user)
    - Name
    - Contact email
    - Links[]
        - Website
        - Social media
    - Projects[] (ipns of projects)
4. Previous launch event data
    - Project (ipns of project)
    - Year
5. Private project keys[] (double encrypted, held by us)
    - Project (ipns of project)
    - Decryption key


## Trust & Abuse concerns

Users will be in full control of the data published, meaning they can enter anything they want and publish it.

In our current client-server model, users are already able to edit a project that we approved to be displayed. These changes appear instantly on the website and are not screened.

For our distributed approach, we'll still allow users to change this whenever and publish to their collaborates from their own devices, but for our community's project gallery, updates to a project will need to be screened, either by a person or by an AI. 


## General data trust

As users can publish changes independently of a central authority, we'll need to verify any external data they link to.

Taking notes from Mastodon, associations like these can be solved by **backlinking**.

For example, if Alice publishes data saying Bob is working on her project, then Bob should publish data to his personal profile that says the same thing. Anyone who views the project can now verify that Bob actually works on Alice's project. The data is immutable and doesn't need to be re-checked unless Alice or Bob updates their profile.

This same approach can be used to verify any published IPNS addresses that belong to other people.