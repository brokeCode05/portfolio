# Database / Data Model — Stonerich Granite Construction and Supply

## Overview

Future-ready data model designed for a headless CMS or database integration. Initially implemented as static data files, with migration path to a database.

## Entity Relationship

```
ProductCategory (1) ──→ (N) Product
CompanyInfo (1)
Service (N)
Project (N)
GalleryItem (N)
FAQ (N)
QuoteRequest (N)
ContactMessage (N)
```

## ProductCategory

| Field | Type | Description |
|---|---|---|
| id | string | Slug (e.g., "granite") |
| name | string | Display name |
| description | string | Category overview |
| image | string | Hero image path |
| order | number | Sort order |

## Product

| Field | Type | Description |
|---|---|---|
| id | string | Slug |
| categoryId | string | FK to ProductCategory |
| name | string | Product name |
| description | string | Full description |
| applications | string[] | Use cases |
| finishes | string[] | Available finishes |
| thickness | string | Content Required |
| origin | string | Content Required |
| availability | string | Stock status |
| images | string[] | Gallery paths |
| specs | object | Technical specifications |
| featured | boolean | Show on home |

## Service

| Field | Type | Description |
|---|---|---|
| id | string | Slug |
| name | string | Service name |
| description | string | Overview |
| benefits | string[] | Key benefits |
| process | Step[] | Step-by-step |
| image | string | Hero image |
| faq | FAQ[] | Service-specific FAQ |

## Project

| Field | Type | Description |
|---|---|---|
| id | string | Slug |
| title | string | Project name |
| category | enum | residential/commercial/hospitality/industrial |
| description | string | Content Required |
| images | string[] | Gallery |
| location | string | Project location |
| year | number | Completion year |
| materials | string[] | Materials used |

## QuoteRequest

| Field | Type | Description |
|---|---|---|
| id | string | UUID |
| name | string | Customer name |
| phone | string | Contact number |
| email | string | Email address |
| projectLocation | string | Project address |
| projectType | string | Type of project |
| material | string | Material needed |
| estimatedArea | string | Area in sqm/sqft |
| budget | string | Budget range |
| timeline | string | Expected timeline |
| message | text | Additional details |
| attachment | string | File URL |
| createdAt | datetime | Submission timestamp |
| status | enum | pending/contacted/completed |

## ContactMessage

| Field | Type | Description |
|---|---|---|
| id | string | UUID |
| name | string | Sender name |
| email | string | Sender email |
| phone | string | Sender phone |
| message | text | Message body |
| createdAt | datetime | Submission timestamp |
| status | enum | unread/read/replied |

## Implementation Notes

- **Phase 1:** Static TypeScript data files in `/src/data/`
- **Phase 2:** Replace with headless CMS (Contentful, Sanity, Strapi)
- **Phase 3:** Optional database layer for quote requests and contact messages
- **Form submissions:** Initially use a form service (Formspree, Web3Forms) then migrate to custom API
