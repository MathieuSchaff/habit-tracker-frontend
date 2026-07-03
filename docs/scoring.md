# Formula assessment

Aurore can analyse a product formula from its INCI list.

The goal is not to give medical advice or to tell users what to buy.

The goal is simpler: help users understand a formula, compare products, and keep track of useful warnings or benefits while doing their own research.

The assessment is computed on the backend.
The frontend only receives the final summary.

---

## What it is

The formula assessment looks at an INCI list and returns a short summary.

It can help answer questions like:

- does this formula contain ingredients that may be irritating?
- does it contain useful ingredient families?
- how much of the INCI list was actually recognised?
- is the result reliable enough to trust, or should it be treated carefully?

It is a research helper, not a medical verdict.

---

## What it is not

The assessment is not:

- a medical diagnosis;
- a treatment recommendation;
- a dermatology opinion;
- a safety score;
- a universal product ranking;
- a guarantee that a product will work;
- a guarantee that a product is compliant with regulations.

Aurore does not try to say: “this product is good” or “this product is bad”.

It gives context so the user can make their own decision.

---

## Engine

The assessment logic lives in a separate library called `algo-derm`.

`algo-derm` is versioned and MIT licensed.

In Aurore, it is included in the backend as a vendored tarball:

```text
vendor/algo-derm.tgz
```

This means the app can be built and run without access to a private package registry.

The ingredient dataset and scoring logic stay on the backend.
They are not shipped to the browser.

---

## Input

The backend calls `analyzeINCI`.

The main input is the ordered INCI list.

The order matters because ingredient position can give a rough concentration signal.

The analysis can also use optional context, such as:

- leave-on or rinse-off product;
- formula type, for example serum, cream, gel, cleanser, lotion or sunscreen;
- estimated pH;
- concentration claims from the packaging;
- user profile context, such as sensitive skin, acne-prone skin, rosacea or pregnancy.

---

## Output

The frontend receives a compact assessment summary.

It includes:

- `rating`: `low`, `medium` or `high`;
- `overallRisk`: a bounded risk signal between `0` and `1`;
- `confidence` and `confidenceScore`;
- `coverage`: how many ingredients were recognised, guessed or unmatched;
- `risks`: main risk signals and their top drivers;
- `benefits`: main benefit signals and their top drivers;
- `productTags` and `ingredientTags`;
- `regulatoryNotes`;
- `unmatchedIngredients`;
- `declarationOnlyRisk`;
- `limitationNotes`.

A more detailed internal result can be kept for debugging and audit surfaces, but the API returns the compact version.

---

## How the assessment works

The result is based on three main things.

### 1. Ingredient signals

The engine looks at known ingredient properties.

Some ingredients can bring possible benefits.
Some can bring possible risks.
Some are mostly neutral or depend heavily on context.

### 2. Product context

The same ingredient can matter differently depending on the product.

For example:

- leave-on vs rinse-off;
- cleanser vs serum;
- low or high pH;
- sensitive skin;
- acne-prone skin;
- rosacea;
- pregnancy.

The engine uses this context to adjust the assessment.

### 3. Confidence

The engine also checks how much of the INCI list it actually understands.

If many ingredients are unknown, the result becomes less confident.

A high rating with low confidence should not be shown as a strong signal.

---

## Unknown ingredients

Unknown ingredients do not break the analysis.

Instead, they:

- lower the confidence;
- lower the coverage ratio;
- appear in the explanation layer.

They are not silently ignored.

Aurore shows caveats when:

- confidence is low;
- coverage is below `0.6`;
- the result is based only on declaration-level information;
- regulatory notes are present.

Regulatory notes are informational only.
They are not a compliance certificate.

---

## Scraped INCI lists

INCI lists from retailer websites are often messy.

They can contain:

- broken separators;
- marketing text;
- labels;
- legal text;
- formatting errors.

Before analysis, the backend cleans the INCI string with:

```text
cleanInci / cleanInciString
```

This cleaning is mostly for storage and display.

The engine also resolves aliases internally.

---

## Limits

The assessment has clear limits.

It does not provide:

- medical advice;
- diagnosis;
- treatment advice;
- clinical efficacy prediction;
- exact formula reconstruction;
- guaranteed regulatory compliance;
- full routine-level interaction modelling.

The engine is still pre-1.0.

Its calibration can change between versions.

The tag definitions are versioned with `TAG_DEFS_VERSION`, and the app pins the version it consumes.

---

## Integration and tests

The backend integration lives in:

```text
backend/src/features/dermo-score/
```

It follows the usual backend pattern:

```text
Route → Service → DB
```

The integration tests use the real engine output, not only mocks.

They check things like:

- risk bounds;
- coverage;
- valid `rating` values;
- behaviour on a real INCI string.
