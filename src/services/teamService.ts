import { supabase } from '../lib/supabase';

export interface Team {
  id: string;
  tenant_id: string;
  name: string;
  team_incharge_id: string;
  status: string;
  product_name: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TeamWithDetails {
  id: string;
  tenant_id: string;
  name: string;
  team_incharge: {
    id: string;
    name: string;
    emp_id: string;
  };
  team_incharge_id: string;
  product_name: string;
  telecallers: {
    id: string;
    name: string;
    emp_id: string;
  }[];
  total_cases: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export class TeamService {
  static async createTeam(teamData: {
    tenant_id: string;
    name: string;
    team_incharge_id: string;
    product_name: string;
    telecaller_ids: string[];
    created_by?: string;
  }): Promise<Team> {
    console.log('Creating team with data:', teamData);
    
    // Validate input data
    if (!teamData.tenant_id) {
      throw new Error('tenant_id is required');
    }
    if (!teamData.name || teamData.name.trim().length === 0) {
      throw new Error('Team name is required and cannot be empty');
    }
    if (!teamData.team_incharge_id) {
      throw new Error('team_incharge_id is required');
    }
    if (!teamData.product_name || teamData.product_name.trim().length === 0) {
      throw new Error('product_name is required and cannot be empty');
    }

    try {
      // First create the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          tenant_id: teamData.tenant_id,
          name: teamData.name.trim(),
          team_incharge_id: teamData.team_incharge_id,
          product_name: teamData.product_name.trim(),
          created_by: teamData.created_by || teamData.team_incharge_id
        })
        .select()
        .single();

      if (teamError) {
        console.error('Team creation error:', teamError);
        throw new Error(`Failed to create team: ${teamError.message}`);
      }

      console.log('Team created successfully:', team);

      // Update telecallers to assign them to this team
      if (teamData.telecaller_ids && teamData.telecaller_ids.length > 0) {
        console.log('Updating telecaller assignments:', teamData.telecaller_ids);
        
        const { error: updateError } = await supabase
          .from('employees')
          .update({ team_id: team.id })
          .in('id', teamData.telecaller_ids);

        if (updateError) {
          console.error('Telecaller assignment error:', updateError);
          // Don't fail the whole operation if telecaller assignment fails
          console.warn('Team created but telecaller assignment failed:', updateError.message);
        } else {
          console.log('Telecaller assignments updated successfully');
        }
      }

      return team;
    } catch (error) {
      console.error('Error in createTeam:', error);
      throw error;
    }
  }

  static async getTeams(tenantId: string): Promise<TeamWithDetails[]> {
    // First get teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        team_incharge:employees(id, name, emp_id)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (teamsError) throw teamsError;

    // Then get telecallers for each team
    const teamsWithTelecallers = await Promise.all(
      teamsData.map(async (team) => {
        const { data: telecallers, error: telecallersError } = await supabase
          .from('employees')
          .select('id, name, emp_id')
          .eq('tenant_id', tenantId)
          .eq('team_id', team.id);

        if (telecallersError) {
          console.error('Error fetching telecallers for team:', team.id, telecallersError);
          return { ...team, telecallers: [] };
        }

        const telecallerIds = telecallers?.map((t: any) => t.id) || [];
        let totalCases = 0;

        if (telecallerIds.length > 0) {
          const { count, error: countError } = await supabase
            .from('customer_cases')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .in('assigned_employee_id', telecallerIds.map((id: any) => id.toString()));

          if (!countError) {
            totalCases = count || 0;
          }
        }

        return {
          ...team,
          telecallers: telecallers || [],
          total_cases: totalCases
        };
      })
    );

    return teamsWithTelecallers;
  }

  static async updateTeam(teamId: string, updates: {
    name?: string;
    team_incharge_id?: string;
    product_name?: string;
    telecaller_ids?: string[];
    status?: string;
  }): Promise<Team> {
    // Update team basic info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .update({
        name: updates.name,
        team_incharge_id: updates.team_incharge_id,
        product_name: updates.product_name,
        status: updates.status
      })
      .eq('id', teamId)
      .select()
      .single();

    if (teamError) throw teamError;

    // Update telecaller assignments if provided
    if (updates.telecaller_ids !== undefined) {
      // First, remove all current assignments for this team
      await supabase
        .from('employees')
        .update({ team_id: null })
        .eq('team_id', teamId);

      // Then assign new telecallers
      if (updates.telecaller_ids.length > 0) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ team_id: teamId })
          .in('id', updates.telecaller_ids);

        if (updateError) throw updateError;
      }
    }

    return team;
  }

  static async deleteTeam(teamId: string): Promise<void> {
    // Remove team assignments from employees
    await supabase
      .from('employees')
      .update({ team_id: null })
      .eq('team_id', teamId);

    // Delete the team
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) throw error;
  }

  static async getAvailableTelecallers(tenantId: string, excludeTeamId?: string): Promise<any[]> {
    let query = supabase
      .from('employees')
      .select('id, name, emp_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'Telecaller')
      .eq('status', 'active');

    if (excludeTeamId) {
      query = query.or(`team_id.is.null,team_id.neq.${excludeTeamId}`);
    } else {
      query = query.is('team_id', null);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;
    return data || [];
  }

  static async getAllTelecallers(tenantId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, emp_id, team_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'Telecaller')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async getTeamIncharges(tenantId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, emp_id')
      .eq('tenant_id', tenantId)
      .eq('role', 'TeamIncharge')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async toggleTeamStatus(teamId: string): Promise<Team> {
    // First get current status
    const { data: currentTeam, error: fetchError } = await supabase
      .from('teams')
      .select('status')
      .eq('id', teamId)
      .single();

    if (fetchError) throw fetchError;

    const newStatus = currentTeam.status === 'active' ? 'inactive' : 'active';

    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update({ status: newStatus })
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) throw updateError;
    return team;
  }
}