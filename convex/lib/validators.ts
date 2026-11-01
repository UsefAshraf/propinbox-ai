import { v } from "convex/values";
import schema from "../schema";

// Full-document validators (table fields + system fields), for `returns` validators.
export const conversationDoc = schema.tables.conversations.validator.extend({
  _id: v.id("conversations"),
  _creationTime: v.number(),
});
export const contactDoc = schema.tables.contacts.validator.extend({
  _id: v.id("contacts"),
  _creationTime: v.number(),
});
export const unitDoc = schema.tables.units.validator.extend({
  _id: v.id("units"),
  _creationTime: v.number(),
});
export const buildingDoc = schema.tables.buildings.validator.extend({
  _id: v.id("buildings"),
  _creationTime: v.number(),
});
export const messageDoc = schema.tables.messages.validator.extend({
  _id: v.id("messages"),
  _creationTime: v.number(),
});
