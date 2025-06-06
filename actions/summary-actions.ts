'use server'

import { getDbConnection } from "@/lib/db"
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteSummaryAction({summaryId}: {summaryId: string}) {
    try{
        const user = await currentUser();
        const userId = user?.id;

        if(!userId){
            throw new Error('User not found');
        }
        // delete from db
        const sql = await getDbConnection();
        const result = await sql`
        delete from pdf_summaires
        where id = ${summaryId} and user_id = ${userId} returning id;
        `;
        if(result.length > 0){
            //revalidatePath
            revalidatePath('/dashboard');
            return {success:true}
        }
        return {success:false}
    }catch(error){
        console.error('Error deleting summary', error);
        return {success: false}
    }
}
