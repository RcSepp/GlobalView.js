function DepthFirstSearch(problem)
{
	var fringe = [];
	var closed = {};
	var result = null;
	
	// Create start node with empty path
	var startnode = {state: problem.getStartState()};
	var node = startnode;
	if (problem.isGoalState(node.state))
		return node.state; // Start state is goal
	closed[problem.computeHash(node.state)] = node.state;
	
	while (true)
	{
		problem.forEachSuccessor(node.state, function(successor) {
			// Test for goal state (before-push)
			if (problem.isGoalState(successor))
			{
				// Goal found
				result = successor; 
				return;
			}

			// Avoid already pushed states (graph search)
			var successor_hash = problem.computeHash(successor);
			if (isUndefined(closed[successor_hash]))
			{
				fringe.push({state: successor});
				closed[successor_hash] = successor;
			}
		});
		if (result !== null)
			return result;

		// Test if maze has been completly traversed without finding any goal state
		if (fringe.length == 0)
			return null; // Goal not found

		// Pop new node and update dirs to be the path of the freshly pop'ed node
		node = fringe.pop();
	}
}

function BreadthFirstSearch(problem)
{
	var fringe = [];
	var closed = {};
	
	var startnode = {state: problem.getStartState()};
	var node = startnode;
	if (problem.isGoalState(node.state))
		return node.state; // Start state is goal
	closed[problem.computeHash(node.state)] = node.state;
	
	while (true)
	{
		problem.forEachSuccessor(node.state, function(successor) {
			var successor_hash = problem.computeHash(successor);
			if (isUndefined(closed[successor_hash]))
			{
				fringe.push({state: successor});
				closed[successor_hash] = successor;
			}
		});

		if (fringe.length === 0)
			return null; // Goal not found
		node = fringe.shift();
		if (problem.isGoalState(node.state))
		{
			fringe = null;
			return node.state; // Goal found
		}
	}
}

function UniformCostSearch(problem)
{
	var fringe = new PriorityQueue('cost');
	var closed = {};

	var startnode = {state: problem.getStartState(), cost: 0.0};
	var node = startnode;
	if (problem.isGoalState(node.state))
		return node.state; // Start state is goal
	closed[problem.computeHash(node.state)] = {state: node.state, prevCost: node.cost};

	while (true)
	{
		problem.forEachSuccessor(node.state, function(successor, successor_cost) {
			var successor_hash = problem.computeHash(successor), _successor;
			if (isUndefined(_successor = closed[successor_hash]) || node.cost + successor_cost < _successor.prevCost)
			{
				fringe.push({state: successor, cost: node.cost + successor_cost});
				closed[successor_hash] = {state: successor, prevCost: node.cost + successor_cost};
			}
		});

		if (fringe.length == 0)
			return null; // Goal not found
		node = fringe.pop();
		if (problem.isGoalState(node.state))
		{
			fringe = null;
			return node.state; // Goal found
		}
	}
}
function SimpleUniformCostSearch(problem)
{
	var fringe = new PriorityQueue('cost');
	var closed = {};

	var startnode = {state: problem.getStartState(), cost: 0.0};
	var node = startnode;
	if (problem.isGoalState(node.state))
		return node.state; // Start state is goal
	closed[problem.computeHash(node.state)] = node.state;

	while (true)
	{
		problem.forEachSuccessor(node.state, function(successor, successor_cost) {
			var successor_hash = problem.computeHash(successor);
			if (isUndefined(closed[successor_hash]))
			{
				fringe.push({state: successor, cost: successor_cost});
				closed[successor_hash] = successor;
			}
		});

		if (fringe.length == 0)
			return null; // Goal not found
		node = fringe.pop();
		if (problem.isGoalState(node.state))
		{
			fringe = null;
			return node.state; // Goal found
		}
	}
}

function SimpleAStarSearch(problem, heuristic)
{
	var fringe = new PriorityQueue('cost');
	var closed = {};

	var CHECK_CONSISTENCY = false;

	var startnode = {state: problem.getStartState(), f: 0.0, g: 0.0};
	var node = startnode;
	if (problem.isGoalState(node.state))
		return node.state; // Start state is goal
	closed[problem.computeHash(node.state)] = node.state;

	while (true)
	{
		problem.forEachSuccessor(node.state, function(successor, successor_cost) {
			var h = problem.heuristic(successor);
			var g = successor_cost;
			if (CHECK_CONSISTENCY && g + h < node.f)
				throw "Inconsistency found in A*-search heuristic";
			var successor_hash = problem.computeHash(successor);
			if (isUndefined(closed[successor_hash]))
			{
				fringe.push({state: successor, f: g + h, g: g});
				closed[successor_hash] = successor;
			}
		});

		if (fringe.length == 0)
			return null; // Goal not found
		node = fringe.pop();
		if (problem.isGoalState(node.state))
		{
			fringe = null;
			return node.state; // Goal found
		}
	}
}

function SimpleGreedySearch(problem)
{
	var startstate = problem.getStartState();
	var state = startstate;
	if (problem.isGoalState(state))
		return state; // Start state is goal
	
	var cheapestCost = Number.MAX_VALUE, cheapestSuccessor;
	while (true)
	{
		cheapestSuccessor = null;
		problem.forEachSuccessor(state, function(successor, successor_cost) {
			if (successor_cost < cheapestCost)
			{
				cheapestCost = successor_cost;
				cheapestSuccessor = successor;
			}
		});
		if ((state = cheapestSuccessor) === null)
			return null; // Goal not found
		if (problem.isGoalState(state))
			return state; // Goal found
	}
}
