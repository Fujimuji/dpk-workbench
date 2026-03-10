# Data Structure Rules

- Mission data array can contain up to 5 elements.
- Index 0: Prime value (product of prime values of selected missions)
- Indices 1-4: Reserved for missions (maximum 4 missions per checkpoint)
- Mission order: Sorted by corresponding prime values, ascending
- Mission type representation:
    - Lock missions: Value = 9930
    - Time missions: Value = Actual time modification (positive or negative)

# Prime Value Table For Missions

| Mission | Value |
| --- | --- |
| No Rocket Punch | 2 |
| No Uppercut | 3 |
| No Seismic Slam | 5 |
| Stallless | 7 |
| Headbounce | 11 |
| 360 Spin | 13 |
| Use Rocket Punch First | 17 |
| Use Uppercut First | 19 |
| Use Seismic Slam First | 23 |
| Diagonal Rocket Punch | 29 |
| Down Diagonal Rocket Punch | 31 |
| Rocket Punch Bounce | 37 |

## Example: Mission Data Construction

Scenario: Checkpoint with 3 missions

1. Use Rocket Punch First (-20 Time)
2. Rocket Punch Bounce (-10 Time)
3. Stalless (Lock)

Resulting array: `[4403, 9930, -20, -10]`

Explanation:

- Index 0: 4403 (7 * 17 * 37, product of prime values)
- Index 1: 9930 (Stalless, lock mission)
- Index 2: -20 (Use Rocket Punch First, time mission)
- Index 3: -10 (Rocket Punch Bounce, time mission)

<aside>
⚠️ Missions are ordered by their corresponding prime values
</aside>