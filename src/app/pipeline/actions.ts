"use server"

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createNotification } from "@/app/notifications/actions";
import { checkStayReminders } from "@/lib/reminders";

export async function getPipelines() {
    // Normalize Firestore Timestamp/Date to ISO string (plain-object safe for RSC serialization)
    const toISO = (val: any): string | null => {
        if (val == null) return null;
        if (typeof val === "string" && val.includes("T")) return val;
        if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
        if (val instanceof Date) return val.toISOString();
        if (val && typeof val.toDate === "function") return val.toDate().toISOString();
        // Firestore Timestamp sometimes appears as plain object { _seconds, _nanoseconds }
        if (typeof val === "object" && typeof val._seconds === "number") {
            return new Date(val._seconds * 1000 + (val._nanoseconds || 0) / 1e6).toISOString();
        }
        const s = String(val);
        if (s.includes("T")) return s;
        return s.slice(0, 10) || null;
    };

    // Converts any date-like value to YYYY-MM-DD for HTML date inputs
    const toDateInput = (val: any): string => {
        const iso = toISO(val);
        if (!iso) return "";
        return iso.split("T")[0];
    };

    try {
        const pipelinesSnapshot = await adminDb.collection('pipelines').orderBy('createdAt', 'asc').get();
        
        const pipelinesMap: Record<string, any> = {};
        
        // Load pipelines and their stages
        for (const doc of pipelinesSnapshot.docs) {
            const data = doc.data();
            const stagesSnapshot = await doc.ref.collection('stages').orderBy('order', 'asc').get();
            const stages = stagesSnapshot.docs.map(sDoc => ({
                id: sDoc.id,
                name: sDoc.data().name,
                order: sDoc.data().order
            }));
            
            pipelinesMap[doc.id] = {
                id: doc.id,
                name: data.name,
                stages: stages,
                deals: []
            };
        }

        // Load all opportunities
        const oppsSnapshot = await adminDb.collection('opportunities').orderBy('createdAt', 'desc').get();
        
        // Cache contacts and users
        const contactsMap: Record<string, any> = {};
        const usersMap: Record<string, any> = {};
        
        const oppsPromises = oppsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            let contact = contactsMap[data.contactId];
            if (!contact && data.contactId) {
                const contactDoc = await adminDb.collection('contacts').doc(data.contactId).get();
                if (contactDoc.exists) {
                    contact = { id: contactDoc.id, ...contactDoc.data() };
                    contactsMap[data.contactId] = contact;
                }
            }

            let assignee = usersMap[data.assigneeId];
            if (!assignee && data.assigneeId) {
                const userDoc = await adminDb.collection('users').doc(data.assigneeId).get();
                if (userDoc.exists) {
                    assignee = { id: userDoc.id, ...userDoc.data() };
                    usersMap[data.assigneeId] = assignee;
                }
            }
            
            // Find which pipeline this belongs to by stage id
            let pipelineId = null;
            let stageName = "";
            for (const pid in pipelinesMap) {
                const stage = pipelinesMap[pid].stages.find((s: any) => s.id === data.pipelineStageId);
                if (stage) {
                    pipelineId = pid;
                    stageName = stage.name;
                    break;
                }
            }

            const base = data.militaryBase || contact?.militaryBase || null;
            const startDate = toDateInput(data.stayStartDate || contact?.stayStartDate);
            const endDate = toDateInput(data.stayEndDate || contact?.stayEndDate);
            let notes = data.notes || null;
            if (!notes && data.contactId) {
                try {
                    const notesSnap = await adminDb
                        .collection('contacts')
                        .doc(data.contactId)
                        .collection('notes')
                        .orderBy('createdAt', 'desc')
                        .limit(1)
                        .get();
                    if (!notesSnap.empty) {
                        notes = notesSnap.docs[0].data()?.content || null;
                    }
                } catch {
                    // Ignore notes fallback failures
                }
            }

            return {
                id: doc.id,
                pipelineId: pipelineId || null,
                pipelineStageId: data.pipelineStageId || null,
                contactId: data.contactId || null,
                name: contact?.name || data.name || "Unknown",
                email: contact?.email || data.email || null,
                phone: contact?.phone || data.phone || null,
                base: base || null,
                stage: stageName || "Unknown",
                value: Number(data.opportunityValue) || 0,
                margin: Number(data.estimatedProfit) || 0,
                priority: data.priority || "MEDIUM",
                startDate: startDate || null,
                endDate: endDate || null,
                assigneeId: data.assigneeId || null,
                assignee: assignee && assignee.name ? assignee.name.split(" ").map((w: string) => w[0]).join("").toUpperCase() : "—",
                assigneeName: assignee?.name || "Unassigned",
                leadSourceId: data.leadSourceId || null,
                tags: Array.isArray(data.tags) ? data.tags.map((t: any) => ({ tagId: t.tagId || null, name: t.name || null, color: t.color || null })) : [],
                specialAccommodationId: data.specialAccommodationId || null,
                source: data.source || null,
                unread: data.unread ?? false,
                unreadAt: toISO(data.unreadAt),
                lastSeenAt: toISO(data.lastSeenAt),
                lastSeenBy: data.lastSeenBy || null,
                notes: notes || null,
                reasonForStay: data.reasonForStay || null,
                specialAccommodationLabels: Array.isArray(data.specialAccommodationLabels) ? data.specialAccommodationLabels : [],
                requiredDocs: {
                    lease: data.requiredDocs?.lease ?? false,
                    tc: data.requiredDocs?.tc ?? false,
                    payment: data.requiredDocs?.payment ?? false,
                },
                createdAt: toISO(data.createdAt),
                updatedAt: toISO(data.updatedAt)
            };
        });

        const allOpps = await Promise.all(oppsPromises);
        
        for (const opp of allOpps) {
            if (opp.pipelineId && pipelinesMap[opp.pipelineId]) {
                pipelinesMap[opp.pipelineId].deals.push(opp);
            }
        }

        return { success: true, pipelines: pipelinesMap };
    } catch (error) {
        console.error("Failed to fetch pipelines:", error);
        return { success: false, error: "Failed to fetch pipeline data" };
    }
}

export async function markOpportunitySeen(id: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const seenBy = (session.user as any).email || session.user.name || "unknown";

        await adminDb.collection('opportunities').doc(id).update({
            unread: false,
            lastSeenAt: new Date(),
            lastSeenBy: seenBy,
            updatedAt: new Date()
        });

        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to mark opportunity seen:", error);
        return { success: false, error: "Failed to mark seen" };
    }
}

export async function bulkCreateOpportunities(opportunities: any[], pipelineId: string) {
    try {
        const pipelineRef = adminDb.collection('pipelines').doc(pipelineId);
        const stagesSnapshot = await pipelineRef.collection('stages').get();
        
        const stageMap = new Map();
        let defaultStageId: string | null = null;
        
        stagesSnapshot.forEach(doc => {
            const data = doc.data();
            stageMap.set(data.name.toLowerCase(), doc.id);
            if (data.name === "New Lead" || !defaultStageId) {
                defaultStageId = doc.id;
            }
        });

        if (!defaultStageId) {
            return { success: false, error: "No stages found for this pipeline." };
        }

        const batch = adminDb.batch();

        for (const opp of opportunities) {
            let contactId = null;
            
            if (opp.email) {
                const contactQuery = await adminDb.collection('contacts').where('email', '==', opp.email).limit(1).get();
                if (!contactQuery.empty) {
                    contactId = contactQuery.docs[0].id;
                }
            }

            if (!contactId) {
                const contactRef = adminDb.collection('contacts').doc();
                contactId = contactRef.id;
                batch.set(contactRef, {
                    name: opp.name || "Unknown",
                    email: opp.email || null,
                    phone: opp.phone || null,
                    militaryBase: opp.base || null,
                    status: "Lead",
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }

            const stageId = stageMap.get(opp.stage?.toLowerCase()) || defaultStageId;
            const oppRef = adminDb.collection('opportunities').doc();
            
            batch.set(oppRef, {
                contactId: contactId,
                pipelineStageId: stageId,
                name: opp.dealName || `${opp.name}'s Deal`,
                opportunityValue: parseFloat(opp.value) || 0,
                estimatedProfit: parseFloat(opp.margin) || 0,
                priority: opp.priority || "MEDIUM",
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        await batch.commit();

        revalidatePath("/pipeline");
        return { success: true, count: opportunities.length };
    } catch (error) {
        console.error("Failed to bulk create opportunities:", error);
        return { success: false, error: "Failed to import opportunities" };
    }
}

export async function createPipeline(name: string) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as any).role === "AGENT") {
            return { success: false, error: "Unauthorized" };
        }

        const pipelineRef = adminDb.collection('pipelines').doc();
        await pipelineRef.set({
            name,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        revalidatePath("/pipeline");
        return { success: true, pipeline: { id: pipelineRef.id, name } };
    } catch (error) {
        console.error("Failed to create pipeline:", error);
        return { success: false, error: "Failed to create pipeline" };
    }
}

export async function createPipelineStage(pipelineId: string, name: string, order: number) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as any).role === "AGENT") {
            return { success: false, error: "Unauthorized" };
        }

        const stageRef = adminDb.collection('pipelines').doc(pipelineId).collection('stages').doc();
        await stageRef.set({
            name,
            order
        });

        revalidatePath("/pipeline");
        return { success: true, stage: { id: stageRef.id, name, order } };
    } catch (error) {
        console.error("Failed to create pipeline stage:", error);
        return { success: false, error: "Failed to create stage" };
    }
}

export async function updatePipelineStage(id: string, name: string, order: number) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as any).role === "AGENT") {
            return { success: false, error: "Unauthorized" };
        }

        // We need to find which pipeline contains this stage
        const pipelines = await adminDb.collection('pipelines').get();
        for (const pipelineDoc of pipelines.docs) {
            const stageDoc = await pipelineDoc.ref.collection('stages').doc(id).get();
            if (stageDoc.exists) {
                await stageDoc.ref.update({ name, order });
                break;
            }
        }

        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to update pipeline stage:", error);
        return { success: false, error: "Failed to update stage" };
    }
}

export async function deletePipelineStage(id: string) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as any).role === "AGENT") {
            return { success: false, error: "Unauthorized" };
        }

        const pipelines = await adminDb.collection('pipelines').get();
        for (const pipelineDoc of pipelines.docs) {
            const stageDoc = await pipelineDoc.ref.collection('stages').doc(id).get();
            if (stageDoc.exists) {
                await stageDoc.ref.delete();
                break;
            }
        }

        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete pipeline stage:", error);
        return { success: false, error: "Failed to delete stage" };
    }
}

export async function deletePipeline(id: string) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as any).role === "AGENT") {
            return { success: false, error: "Unauthorized" };
        }

        const pipelineRef = adminDb.collection('pipelines').doc(id);
        
        // Delete subcollections manually in Firestore
        const stagesSnapshot = await pipelineRef.collection('stages').get();
        const batch = adminDb.batch();
        stagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        batch.delete(pipelineRef);
        await batch.commit();

        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete pipeline:", error);
        return { success: false, error: "Failed to delete pipeline" };
    }
}

export async function createNewDeal(data: any, pipelineId?: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        let contactId = null;
        if (data.email) {
            const contactQuery = await adminDb.collection('contacts').where('email', '==', data.email).limit(1).get();
            if (!contactQuery.empty) {
                contactId = contactQuery.docs[0].id;
            }
        } else if (data.contactId) {
            contactId = data.contactId;
        }

        if (!contactId) {
            const contactRef = adminDb.collection('contacts').doc();
            contactId = contactRef.id;
            
            let formattedStartDate = null;
            let formattedEndDate = null;
            if (data.startDate) formattedStartDate = new Date(data.startDate).toISOString();
            if (data.endDate) formattedEndDate = new Date(data.endDate).toISOString();

            await contactRef.set({
                name: data.name || "New Lead",
                email: data.email || null,
                phone: data.phone || null,
                militaryBase: data.base || null,
                stayStartDate: formattedStartDate,
                stayEndDate: formattedEndDate,
                status: "Lead",
                createdAt: new Date(),
                updatedAt: new Date()
            });
        } else {
            // Update existing contact dates if provided
            const contactUpdate: any = { updatedAt: new Date() };
            if (data.name && data.name !== "New Lead") contactUpdate.name = data.name;
            if (data.phone) contactUpdate.phone = data.phone;
            if (data.base) contactUpdate.militaryBase = data.base;
            if (data.startDate) contactUpdate.stayStartDate = new Date(data.startDate).toISOString();
            if (data.endDate) contactUpdate.stayEndDate = new Date(data.endDate).toISOString();
            await adminDb.collection('contacts').doc(contactId).update(contactUpdate);
        }

        // Find stage ID
        let targetPipelineId = pipelineId;
        if (!targetPipelineId) {
            const pipelinesSnap = await adminDb.collection('pipelines').orderBy('createdAt', 'asc').limit(1).get();
            if (!pipelinesSnap.empty) {
                targetPipelineId = pipelinesSnap.docs[0].id;
            }
        }

        if (!targetPipelineId) return { success: false, error: "No pipeline found" };

        const pipelineRef = adminDb.collection('pipelines').doc(targetPipelineId);
        const stagesSnapshot = await pipelineRef.collection('stages').get();
        let stageId: string | null = null;
        stagesSnapshot.forEach(doc => {
            if (doc.data().name === data.stage || (!stageId && doc.data().name.includes('Lead'))) {
                stageId = doc.id;
            }
        });
        if (!stageId && !stagesSnapshot.empty) {
            stageId = stagesSnapshot.docs[0].id;
        }

        const oppRef = adminDb.collection('opportunities').doc();
        await oppRef.set({
            contactId: contactId,
            pipelineStageId: stageId,
            name: `${data.name || "New Lead"} - Deal`,
            opportunityValue: Number(data.value) || 0,
            estimatedProfit: Number(data.margin) || 0,
            priority: data.priority || "MEDIUM",
            assigneeId: data.assigneeId || null,
            specialAccommodationId: data.specialAccommodationId || null,
            militaryBase: data.base || null,
            stayStartDate: data.startDate ? new Date(data.startDate).toISOString() : null,
            stayEndDate: data.endDate ? new Date(data.endDate).toISOString() : null,
            notes: data.notes || null,
            unread: true,
            unreadAt: new Date(),
            lastSeenAt: null,
            lastSeenBy: null,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Notify team about the new opportunity
        await createNotification({
            title: "New opportunity created",
            message: `${data.name || "New Lead"}${data.base ? ` • ${data.base}` : ""}`,
            type: "opportunity",
            linkUrl: `/pipeline?deal=${oppRef.id}`
        });

        if (data.notes) {
            await adminDb.collection('contacts').doc(contactId).collection('notes').add({
                content: data.notes,
                contactId: contactId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        revalidatePath("/pipeline");
        return { success: true, dealId: oppRef.id };
    } catch (error) {
        console.error("Failed to create new deal:", error);
        return { success: false, error: "Failed to create new deal" };
    }
}

export async function updateOpportunity(id: string, data: {
    pipelineStageId?: string;
    name?: string;
    email?: string;
    phone?: string;
    value?: number;
    margin?: number;
    priority?: string;
    startDate?: string;
    endDate?: string;
    base?: string;
    notes?: string;
    contactId?: string;
    assigneeId?: string | null;
    leadSourceId?: string | null;
    tagIds?: string[];
    specialAccommodationId?: string | null;
}) {
    console.log("SERVER ACTION: updateOpportunity called with id", id, data);
    try {
        const oppId = id && String(id).trim();
        if (!oppId) {
            return { success: false, error: "Invalid opportunity id" };
        }
        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        if (data.pipelineStageId !== undefined) updateData.pipelineStageId = data.pipelineStageId;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.value !== undefined) updateData.opportunityValue = Number(data.value) || 0;
        if (data.margin !== undefined) updateData.estimatedProfit = Number(data.margin) || 0;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
        if (data.leadSourceId !== undefined) updateData.leadSourceId = data.leadSourceId;
        if (data.specialAccommodationId !== undefined) updateData.specialAccommodationId = data.specialAccommodationId;
        if (data.base !== undefined) updateData.militaryBase = data.base || null;
        if (data.startDate !== undefined) updateData.stayStartDate = data.startDate && String(data.startDate).trim() ? new Date(data.startDate).toISOString() : null;
        if (data.endDate !== undefined) updateData.stayEndDate = data.endDate && String(data.endDate).trim() ? new Date(data.endDate).toISOString() : null;
        if (data.notes !== undefined) updateData.notes = data.notes != null ? String(data.notes) : null;

        if (data.tagIds !== undefined) {
            updateData.tags = await Promise.all(data.tagIds.map(async (tagId) => {
                const tagDoc = await adminDb.collection('tags').doc(tagId).get();
                return { 
                    tagId, 
                    name: tagDoc.data()?.name || null, 
                    color: tagDoc.data()?.color || null 
                };
            }));
        }

        const docRef = adminDb.collection('opportunities').doc(oppId);
        const snap = await docRef.get();
        if (!snap.exists) {
            return { success: false, error: "Opportunity not found" };
        }
        await docRef.update(updateData);

        if (data.contactId && data.notes !== undefined) {
            const content = data.notes ? String(data.notes).trim() : "";
            if (content) {
                await adminDb.collection('contacts').doc(data.contactId).collection('notes').add({
                    content,
                    contactId: data.contactId,
                    opportunityId: oppId,
                    source: "opportunity",
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }

        if (data.contactId && (data.startDate !== undefined || data.endDate !== undefined || data.base !== undefined || data.name !== undefined || data.email !== undefined || data.phone !== undefined)) {
            const contactUpdate: any = { updatedAt: new Date() };
            if (data.startDate !== undefined) contactUpdate.stayStartDate = data.startDate && String(data.startDate).trim() ? new Date(data.startDate).toISOString() : null;
            if (data.endDate !== undefined) contactUpdate.stayEndDate = data.endDate && String(data.endDate).trim() ? new Date(data.endDate).toISOString() : null;
            if (data.base !== undefined) contactUpdate.militaryBase = data.base || null;
            if (data.name !== undefined) contactUpdate.name = data.name;
            if (data.email !== undefined) contactUpdate.email = data.email;
            if (data.phone !== undefined) contactUpdate.phone = data.phone;

            await adminDb.collection('contacts').doc(data.contactId).update(contactUpdate);
        }

        revalidatePath("/pipeline");
        revalidatePath("/calendar");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update opportunity";
        console.error("Failed to update opportunity:", error);
        return { success: false, error: String(message) };
    }
}

export async function deleteOpportunity(id: string) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as any).role === "AGENT") {
            throw new Error("Unauthorized");
        }

        await adminDb.collection('opportunities').doc(id).delete();

        revalidatePath("/pipeline");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete opportunity:", error);
        return { success: false, error: error.message || "Failed to delete opportunity" };
    }
}

export async function getBaseNames(): Promise<string[]> {
    try {
        const metadataDoc = await adminDb.collection('metadata').doc('bases').get();
        if (metadataDoc.exists && metadataDoc.data()?.names) {
            return metadataDoc.data()?.names.sort();
        }
        
        // Fallback to legacy military_bases collection if metadata doc doesn't exist
        const snapshot = await adminDb.collection('military_bases').orderBy('name', 'asc').get();
        return snapshot.docs.map(doc => doc.data().name);
    } catch {
        return [];
    }
}

export async function getUsers() {
    try {
        const snapshot = await adminDb.collection('users').orderBy('name', 'asc').get();
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            email: doc.data().email,
            role: doc.data().role
        }));
        return { success: true, users };
    } catch {
        return { success: true, users: [] };
    }
}

export async function updateRequiredDocs(opportunityId: string, field: "lease" | "tc" | "payment", value: boolean) {
    try {
        await adminDb.collection('opportunities').doc(opportunityId).update({
            [`requiredDocs.${field}`]: value,
            updatedAt: new Date()
        });
        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to update required docs:", error);
        return { success: false, error: "Failed to update required docs" };
    }
}

export async function moveToLeaseSigned(opportunityId: string) {
    try {
        // Find the opportunity to get its pipeline
        const oppDoc = await adminDb.collection('opportunities').doc(opportunityId).get();
        if (!oppDoc.exists) return { success: false, error: "Opportunity not found" };

        const oppData = oppDoc.data()!;
        const currentStageId = oppData.pipelineStageId;

        // Find which pipeline this belongs to
        const pipelines = await adminDb.collection('pipelines').get();
        let leaseSignedStageId: string | null = null;

        for (const pDoc of pipelines.docs) {
            const stages = await pDoc.ref.collection('stages').get();
            const hasCurrentStage = stages.docs.some(s => s.id === currentStageId);
            if (hasCurrentStage) {
                const leaseStage = stages.docs.find(s => s.data().name === "Lease Signed");
                if (leaseStage) leaseSignedStageId = leaseStage.id;
                break;
            }
        }

        if (!leaseSignedStageId) return { success: false, error: "Lease Signed stage not found in this pipeline" };

        await adminDb.collection('opportunities').doc(opportunityId).update({
            pipelineStageId: leaseSignedStageId,
            updatedAt: new Date()
        });

        revalidatePath("/pipeline");
        return { success: true };
    } catch (error) {
        console.error("Failed to move to Lease Signed:", error);
        return { success: false, error: "Failed to move to Lease Signed" };
    }
}

export async function autoAdvanceOpportunities() {
    try {
        const now = new Date();
        const today = now.toISOString().split("T")[0];

        // Get all pipelines and find "Lease Signed", "Move In Scheduled", and "Current Tenant" stages
        const pipelinesSnap = await adminDb.collection('pipelines').get();

        let advancedCount = 0;

        for (const pDoc of pipelinesSnap.docs) {
            const stagesSnap = await pDoc.ref.collection('stages').get();
            const stageMap = new Map<string, { id: string; name: string }>();
            stagesSnap.docs.forEach(s => stageMap.set(s.id, { id: s.id, name: s.data().name }));

            const triggerStageIds = new Set<string>();
            let currentTenantStageId: string | null = null;

            for (const [id, stage] of stageMap) {
                const nameLower = stage.name.toLowerCase();
                if (nameLower === "lease signed" || nameLower === "move in scheduled") {
                    triggerStageIds.add(id);
                }
                if (nameLower === "current tenant") {
                    currentTenantStageId = id;
                }
            }

            if (triggerStageIds.size === 0 || !currentTenantStageId) continue;

            // Find opportunities in these stages
            for (const stageId of triggerStageIds) {
                const oppsSnap = await adminDb.collection('opportunities')
                    .where('pipelineStageId', '==', stageId)
                    .get();

                for (const oppDoc of oppsSnap.docs) {
                    const data = oppDoc.data();
                    let startDate = data.stayStartDate;

                    // Try contact fallback if no direct start date
                    if (!startDate && data.contactId) {
                        const contactDoc = await adminDb.collection('contacts').doc(data.contactId).get();
                        if (contactDoc.exists) {
                            startDate = contactDoc.data()?.stayStartDate;
                        }
                    }

                    if (!startDate) continue;

                    // Normalize to YYYY-MM-DD for comparison
                    const startStr = typeof startDate === 'string'
                        ? startDate.split("T")[0]
                        : startDate.toDate ? startDate.toDate().toISOString().split("T")[0]
                        : null;

                    if (startStr && startStr <= today) {
                        await oppDoc.ref.update({
                            pipelineStageId: currentTenantStageId,
                            updatedAt: new Date()
                        });
                        advancedCount++;
                    }
                }
            }
        }

        revalidatePath("/pipeline");
        return { success: true, advancedCount };
    } catch (error) {
        console.error("Failed to auto-advance opportunities:", error);
        return { success: false, error: "Failed to auto-advance opportunities" };
    }
}

export async function runStayReminders() {
    try {
        const result = await checkStayReminders();
        return { success: true, ...result };
    } catch (error) {
        console.error("Failed to run stay reminders:", error);
        return { success: false };
    }
}
