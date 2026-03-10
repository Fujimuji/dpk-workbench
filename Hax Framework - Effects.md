# Example data structure for an effect (applies for most) :

> **Array(position of effect, radius, effect status, product of prime attributes/time value);**
> 

## 👇 Look below to see what each index value is like for specific effects

- **Time Effect** (Does not exist in Project Momentum yet, so it will be removed while doing the conversion for now)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect | If it’s negative, it’s shootable |
    | 2 | Number | 0 |  |
    | 3 | Number | Time value to add/subtract from runtime |  |

---

- **Death Effect** (Exists in Project Momentum)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect | If it’s negative, it’s a light shaft |
    | 2 | Number | 1 |  |
    | 3 | Number | 1 | Doesn’t matter for death effect |

---

- **Ability Effect** (Exists in Project Momentum)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect | If it’s negative, it’s a light shaft |
    | 2 | Number | 2 |  |
    | 3 | Number | Prime value (attributes) | If it’s negative, it resets cooldowns |
    
    <aside>
    ℹ️ **Prime attributes:
    2  : Punch Disabled
    3  : Powerblock Disabled
    5  : Slam Disabled
    7  : Force Stall (not needed for Project Momentum)
    11 : No Change to Abilities (if it has this convert it to touch orb in Project Momentum instead)
    29 : Empowered Punch** (not implemented in Project Momentum yet)
    
    </aside>
    

---

- **Permeation Effect** (Does not exist in Project Momentum yet, so it will be removed while doing the conversion for now)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect | If it’s negative, it’s a light shaft |
    | 2 | Number | 3 |  |
    | 3 | Number | Prime value (attributes) | If it’s negative, it resets cooldowns |
    
    <aside>
    ℹ️ **Prime attributes:
    2  : Punch Disabled
    3  : Powerblock Disabled
    5  : Slam Disabled
    11 : No Change to Abilities (not needed for Project Momentum)
    29 : Empowered Punch
    31 : Collision not changed**
    
    </aside>


---

- **Checkpoint Effect** (Does not exist in Project Momentum and won't be implemented so we can remove it while doing the conversion)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect |  |
    | 2 | Number | 4 |  |
    | 3 | Number | Prime value (attributes) | If it’s negative, it resets cooldown |
    
    <aside>
    ℹ️ **Prime attributes:
    2  : Punch Disabled
    3  : Uppercut Disabled
    5  : Slam Disabled
    7  : Centerless
    11 : No Change to Abilities
    29 : Empowered Punch**
    
    </aside>


---


- **Portal Effect** (Does not exist in Project Momentum yet, so it will be removed while doing the conversion for now)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect | It’s hardcoded in the framework |
    | 2 | Number | 5 or 6 | 5 for entry portal, 6 for exit portal |
    | 3 | Number | Prime value (attributes) | If it’s negative, it resets cooldowns |
    
    <aside>
    ℹ️ **Prime attributes:
    2  : Punch Disabled
    3  : Powerblock Disabled
    5  : Slam Disabled
    11 : No Change to Abilities (not needed for Project Momentum)
    29 : Empowered Punch** (not implemented in Project Momentum yet)
    
    </aside>
    

---

- **Blackhole Effect** (Does not exist in Project Momentum and won't be implemented so we can remove it while doing the conversion)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect |  |
    | 2 | Number | 7 |  |
    | 3 | Number | 0 | Doesn’t do anything |

---

- **Zipline Effect** (Does not exist in Project Momentum and won't be implemented so we can remove it while doing the conversion)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | 0 or 1 | Hardcoded, 0 for starting point, 1 for ending point |
    | 2 | Number | 8 or 9 | 8 for starting point, 9 for ending point |
    | 3 | Number | 0 | Doesn’t do anything |

---

- **Shootable Orb Effect** 
(Project Momentum has enemy bots that are shootable instead, so we only need this effect's position and ability prime values (2,3,5))
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect |  |
    | 2 | Number | 10 |  |
    | 3 | Number | Prime value (attributes) | If it’s negative, it resets cooldown |
    
    <aside>
    ℹ️ **Prime attributes:**
    **2  : Punch Disabled
    3  : Powerblock Disabled
    5  : Slam Disabled
    11 : No Change to Abilities (not needed for Project Momentum)
    29 : Empowered Punch** (not implemented in Project Momentum yet)
    
    </aside>
    

---

- **Bounce Effect** (Does not exist in Project Momentum yet, so it will be removed while doing the conversion for now)
    
    
    | Index | Type | Value | Notes |
    | --- | --- | --- | --- |
    | 0 | Vector | Position of the effect |  |
    | 1 | Number | Radius of the  effect | If it’s negative, it’s a light shaft |
    | 2 | Number | 11 |  |
    | 3 | Array | [direction, power] |  |
    
    <aside>
    ℹ️ **Power value of 0.016 will turn the effect into a stall effect (an effect you can land on basically and stay on top of it)
    Power value of 0 will turn the effect into a stop effect that kills momentum (can’t make light shaft)**
    
    </aside>

    Some notes that goes for all effect types here:
    - Lightshaft functionality doesn't exist in Project Momentum.
    - Cooldown reset happens by default in Project Momentum.