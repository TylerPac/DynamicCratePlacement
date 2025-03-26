# 🧱 Dynamic Crate Placement Tool for DayZ

This Node.js toolset automates the placement of dynamic loot crates in the **DayZ Enfusion Engine**, allowing you to relocate buildings and crates without manually recalculating positions and orientations. It's perfect for developers building custom maps or modded content.

---

## 🚀 Features

- 🔁 **Automatic recalculation** of crate positions and orientations relative to building changes.
- 🛠️ **Multi-crate support** for each building.
- 📦 Assigns **loot table types** based on crate names.
- 📄 Outputs directly to `output.json` for fast integration into your mod files.
- ✍️ Scripted crate placement generator via CLI input (`BuildingOutput.js`).
- 🧠 Smart orientation adjustments (yaw-aware).
- 📥 XML parser for `mapgrouppos.xml` building data.

---

## 📂 Files Overview

| File                | Purpose |
|---------------------|---------|
| `OK_building.js`    | (Optional) Your XML parsing logic, if modularized. |
| `BuildingOutput.js` | CLI tool to define new buildings and crates for dynamic placement. |
| `DynamicCratePlacement.js` | Main engine that recalculates positions, generates output, and maps crates to loot tables. |

---

## 🛠️ How to Use

### 1. Prepare Building and Crate Input

Run the interactive crate input tool:

```bash
node BuildingOutput.js
```

You will be prompted to enter:

- Building position & orientation
- Building config type (e.g., `Land_Workshop2`)
- Crate(s) position, orientation, and config type

Output: JavaScript `if` block that you paste into `DynamicCratePlacement.js`.

---

### 2. Add Output Block to `DynamicCratePlacement.js`

Paste the generated `if (buildingName === 'XYZ') { ... }` block into the `parseXML()` logic of `DynamicCratePlacement.js`.

---

### 3. Set Input Files

Ensure your XML path is set correctly at the bottom of `DynamicCratePlacement.js`:

```js
const xmlFilePath = './mpmissions/empty.alteria/mapgrouppos.xml';
const outputFilePath = './output.json';
```

---

### 4. Run the Tool

```bash
node DynamicCratePlacement.js
```

The output file (`output.json`) will contain all crate definitions in JSON format for your loot mod.

---

## 📘 Loot Table Support

The tool auto-maps crates to loot tables using internal logic like:

| Crate Name                  | Loot Table          |
|-----------------------------|---------------------|
| `Medical_Bag`               | `MedicalBagLoot`    |
| `WeaponCrate`               | `WeaponCrateLoot`   |
| `Duffle_Bag`, `DrugCrate`   | `DuffleLoot`        |
| `Safe`                      | `SafeLoot`          |
| `Toolbox`                   | `ToolBoxLoot`       |
| `BuildingCrate_HackableCrate` | `Locked_Crates`    |

If a crate name is unknown, it defaults to `"CHANGEME"` so you can manually update it later.

---

## 💡 Example Output

```json
{
  "LocationName": "Land_Workshop2",
  "ContainerName": "WeaponCrate",
  "LootTable": "WeaponCrateLoot",
  "POS": [10939.200195, 6.122270, 2696.850098],
  "ORI": [-90.000000, 0.000000, 0.000000],
  "IsActive": 1
}
```

---

## 📦 Requirements

- Node.js (v14+)
- A modding-friendly environment
- Access to your mission’s `mapgrouppos.xml`

---

## 🧠 Developer Notes

- Enfusion uses **YPR** (yaw, pitch, roll). The tool converts correctly from ARMA’s RPY format.
- Building repositioning logic handles trigonometric adjustments automatically.
- Supports complex map layouts with multi-building automation.

---

## ✍️ Author

**Tyler Pac**  
🎮 DayZ Enfusion Developer – 3+ years experience  
💻 Passionate about modding, JavaScript, and C#/C++ backend logic

---

## 🛡 License

MIT – feel free to use and adapt.

---

## 🙌 Contribute

Pull requests and suggestions are welcome!
