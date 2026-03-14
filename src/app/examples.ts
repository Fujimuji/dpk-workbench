import type { WorkspaceExampleInputs } from '@/app/useWorkspaceSession';

export const HAX_EXAMPLE_INPUT = `variables
{
\tglobal:
\t\t0: CPposition
\t\t1: Radius_VA_GoBackCP
\t\t2: Connections
\t\t3: Mission
\t\t4: Prime
\t\t5: AbilityCount
\t\t6: HiddenCP_TpRad_TT
\t\t7: TP
\t\t8: Effect
\t\t9: FakeUpperCP
}

actions
{
\tGlobal.CPposition = Array(Vector(56.186, 23.327, -103.648), Vector(59.319, 18.723, -95.881), Vector(40.253, 7.825, -86.432),
\t\tVector(43.735, 5.199, -64.856), Vector(13.643, 5.839, -75.646), Vector(-1.964, 4.217, -91.696), Vector(79.769, 12.683,
\t\t-97.417), Vector(82.175, 12.683, -90.527), Vector(84.304, 12.683, -83.459), Vector(85.960, 12.680, -76.094), Vector(80.388,
\t\t12.668, -69.460));
\tGlobal.Radius_VA_GoBackCP = Array(Vector(2, 0, -1), Vector(2, 0, 0), Vector(2, 0, 1), Vector(2, 0, 2), Vector(2, 0, 3), Vector(2,
\t\t0, 4), Vector(2, 0, 0), Vector(2, 0, 6), Vector(2, 0, 7), Vector(2, 0, 8), Vector(2, 0, 9));
\tGlobal.Connections = Array(0, 2, 3, 4, 5, False, 7, 8, 9, 10, False);
\tGlobal.Mission = Array(True, True, True, True, True, True, True, True, True, True, True);
\tGlobal.Prime = Array(165, 221, True, True, 17, True, 13, True, True, True, True);
\tGlobal.AbilityCount = Array(False, 0, Vector(5, 2, 3), False, False, False, 0, False, False, False, False);
\tGlobal.HiddenCP_TpRad_TT = Array(False, False, False, Vector(0, 0, 5), False, False, False, False, False, Vector(0, 2, 0), False);
\tGlobal.TP = Array(False, 0, False, False, False, False, 0, False, False, Vector(90.547, 12.641, -71.230), False);
\tGlobal.Effect = Array(False, Array(Array(Vector(43.047, 17.318, -93.148), -2, 2, 1), Array(Vector(49.778, 18.714, -87.196), -2, 2,
\t\t11)), Array(Array(Vector(37.847, 13.383, -80.670), 2, 1, 0), Array(Vector(46.165, 9.908, -77.676), 2, 0, -0.500), Array(Vector(
\t\t41.403, 7.482, -80.555), 2, 11, Array(Vector(0, 1, 0), 10))), Array(Array(Vector(36.798, 7.258, -63.696), 1.100, 5, 11), Array(
\t\tVector(29.043, 20.684, -73.125), 1.100, 6, 11), Array(Vector(40.193, 8.120, -59.760), 2, 7, 0)), Array(Array(Vector(10.686,
\t\t7.396, -72.008), -2, 3, 11), Array(Vector(15.133, 7.380, -70.315), 0, 8, 0), Array(Vector(18.877, 7.380, -63.236), 1, 9,
\t\tFalse), Array(Vector(5.200, 5.917, -78.727), 2, 4, 1), Array(Vector(9.744, 7.483, -83.239), 1.312, 10, 1)), False, 0, False,
\t\tFalse, False, False);
\tGlobal.FakeUpperCP = Array(True, True, True, True, True, True, True, True, True, True, True);
}`;

export const MOMENTUM_EXAMPLE_INPUT = `variables
{
\tglobal:
\t\t2: start
\t\t3: c_checkpointVectors
\t\t5: c_levelData
\t\t6: c_checkpointSizes
\t\t7: c_checkpointsLiquid
\t\t8: c_checkpointTimeLimits
\t\t9: c_heightGoals
\t\t10: c_checkpointMinimumSpeeds
\t\t11: c_checkpointDisableAbilities
\t\t12: c_checkpointTouchOrbLocations
\t\t13: c_checkpointTouchOrbSizes
\t\t14: c_checkpointAbilityOrbLocations
\t\t15: c_checkpointAbilityOrbAbilities
\t\t16: c_checkpointAbilityOrbSizes
\t\t17: c_checkpointLavaLocations
\t\t18: c_checkpointLavaSizes
\t\t19: c_botLocation
\t\t20: c_checkpointBotValidAbilities
\t\t21: c_checkpointImpulseLocations
\t\t22: c_checkpointImpulseDirections
\t\t23: c_checkpointImpulseSpeeds
\t\t24: c_checkpointPortals
\t\t25: ctrl

\tplayer:
\t\t5: isInLevel
}

actions
{
\tGlobal.start = Vector(48.391, 9.911, 41.151);
\tGlobal.c_levelData[0] = Array(Custom String("Level 1"), Color(Aqua));
\tGlobal.c_checkpointVectors[0] = Array(Vector(53.192, 3.626, 33.323), Vector(53.634, 7.886, 7.656), Vector(50.239, 12.502, 2.673));
\tGlobal.c_checkpointSizes[0] = Array(2, 2, 2.7);
\tGlobal.c_checkpointsLiquid[0] = Array(Null, True);
\tGlobal.c_checkpointTimeLimits[0] = Null;
\tGlobal.c_heightGoals[0] = Null;
\tGlobal.c_checkpointDisableAbilities[0] = Null;
\tGlobal.c_checkpointTouchOrbLocations[0] = Array(Array(Vector(53.900, 10, 20.700)), Array(Vector(51.040, 7, -8.800)));
\tGlobal.c_checkpointTouchOrbSizes[0] = Array(0.500, 1);
\tGlobal.c_checkpointAbilityOrbLocations[0] = Null;
\tGlobal.c_checkpointAbilityOrbAbilities[0] = Null;
\tGlobal.c_checkpointAbilityOrbSizes[0] = Null;
\tGlobal.c_checkpointLavaLocations[0] = Null;
\tGlobal.c_checkpointLavaSizes[0] = Null;
\tGlobal.c_botLocation[0] = Null;
\tGlobal.c_checkpointBotValidAbilities[0] = Null;
\tGlobal.c_checkpointMinimumSpeeds[0] = Array(Null, 6);
\tGlobal.c_checkpointImpulseLocations[0] = Array(Array(Vector(43.440, 4.880, 14.360)), Array(Vector(50.110, 7.890, 10.200)));
\tGlobal.c_checkpointImpulseDirections[0] = Array(Array(Up, Vector(0, -1, 1)), Array(Vector(0, 1, 0)), Null);
\tGlobal.c_checkpointImpulseSpeeds[0] = Array(Array(16, 25), Array(18));
\tGlobal.c_checkpointPortals[0] = Array(Null, Array(Vector(53.900, 10, 20.700), Vector(50.239, 12.502, 2.673)), Null);
\tGlobal.c_levelData[1] = Array(Custom String("Level 2"), Color(Purple));
\tGlobal.c_checkpointVectors[1] = Array(Vector(40.349, 3.719, 34.528), Vector(40.490, 10.860, 20.549), Vector(50.199, 5.656,
\t\t-25.572));
\tGlobal.c_checkpointsLiquid[1] = Null;
\tGlobal.c_checkpointTimeLimits[1] = Array(Null, 6);
\tGlobal.c_heightGoals[1] = Array(20);
\tGlobal.c_checkpointDisableAbilities[1] = Array(Null, Array(False, True, True));
\tGlobal.c_checkpointTouchOrbLocations[1] = Null;
\tGlobal.c_checkpointTouchOrbSizes[1] = Null;
\tGlobal.c_checkpointAbilityOrbLocations[1] = Array(Null, Array(Vector(53.230, 13, 9.700)));
\tGlobal.c_checkpointAbilityOrbAbilities[1] = Array(Null, Array(Array(True, True, True)));
\tGlobal.c_checkpointAbilityOrbSizes[1] = Array(Null, Array(1));
\tGlobal.c_checkpointLavaLocations[1] = Array(Null, Array(Vector(34.460, 4.800, 25.771)));
\tGlobal.c_checkpointLavaSizes[1] = Array(Null, Array(2));
\tGlobal.c_botLocation[1] = Null;
\tGlobal.c_checkpointBotValidAbilities[1] = Null;
\tGlobal.c_checkpointMinimumSpeeds[1] = Null;
\tGlobal.c_levelData[2] = Array(Custom String("Level 3"), Color(Orange));
\tGlobal.c_checkpointVectors[2] = Array(Vector(33.849, 5.794, 41.789), Vector(34.460, 4.800, 25.771));
\tGlobal.c_checkpointsLiquid[2] = Null;
\tGlobal.c_checkpointTimeLimits[2] = Null;
\tGlobal.c_heightGoals[2] = Null;
\tGlobal.c_checkpointDisableAbilities[2] = Null;
\tGlobal.c_checkpointTouchOrbLocations[2] = Null;
\tGlobal.c_checkpointTouchOrbSizes[2] = Null;
\tGlobal.c_checkpointAbilityOrbLocations[2] = Null;
\tGlobal.c_checkpointAbilityOrbAbilities[2] = Null;
\tGlobal.c_checkpointAbilityOrbSizes[2] = Null;
\tGlobal.c_checkpointLavaLocations[2] = Null;
\tGlobal.c_checkpointLavaSizes[2] = Null;
\tGlobal.c_checkpointMinimumSpeeds[2] = Null;
\tGlobal.c_botLocation[2] = Array(Vector(42.577, 3.837, 31.078));
\tGlobal.c_checkpointBotValidAbilities[2] = Array(Array(True, False, True));
\t"Level Effects"
\tCreate Effect(Local Player.isInLevel ? Null : Local Player, Ring, Color(Gray), Global.start, 3, Visible To);
\tFor Global Variable(ctrl, 0, Count Of(Global.c_levelData), 1);
\t\tCreate Effect(Local Player.isInLevel ? Null : Local Player, Ring, Global.c_levelData[Global.ctrl][1], First Of(
\t\t\tGlobal.c_checkpointVectors[Global.ctrl]), 2, Visible To);
\t\tCreate In-World Text(Local Player.isInLevel ? Null : Local Player, Global.c_levelData[Global.ctrl][0], First Of(
\t\t\tGlobal.c_checkpointVectors[Global.ctrl]) + Up * 1.500, 1.200, Do Not Clip, Visible To, Global.c_levelData[Global.ctrl][1],
\t\t\tDefault Visibility);
\tEnd;
}`;

export const WORKSPACE_EXAMPLE_INPUTS: WorkspaceExampleInputs = {
  hax: HAX_EXAMPLE_INPUT,
  momentum: MOMENTUM_EXAMPLE_INPUT
};
